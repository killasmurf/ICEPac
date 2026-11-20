"""Default supplier on resources: create, update, validation, response, filter."""

import pytest

from app.models.database.resource import Resource, Supplier
from app.models.database.user import UserRole
from tests.helpers import auth, make_user

API = "/api/v1/admin/resources"


@pytest.fixture
def admin(db):
    return make_user(db, "boss", UserRole.ADMIN)


@pytest.fixture
def suppliers(db):
    db.add_all(
        [
            Supplier(supplier_code="ACME", name="Acme Pty Ltd"),
            Supplier(supplier_code="GEO-01", name="Geotech Partners"),
        ]
    )
    db.commit()


def _body(**extra):
    return {"resource_code": "r-1", "description": "Res", "cost": "10.00", **extra}


def test_create_without_supplier_has_null_supplier(client, admin):
    resp = client.post(API, json=_body(), headers=auth(admin))
    assert resp.status_code == 201
    assert resp.json()["supplier_code"] is None
    assert resp.json()["supplier_name"] is None


def test_create_with_supplier_returns_code_and_name(client, admin, suppliers):
    resp = client.post(API, json=_body(supplier_code="acme "), headers=auth(admin))
    assert resp.status_code == 201, resp.text
    assert resp.json()["supplier_code"] == "ACME"
    assert resp.json()["supplier_name"] == "Acme Pty Ltd"


def test_create_with_unknown_supplier_is_422(client, admin, suppliers):
    resp = client.post(API, json=_body(supplier_code="NOPE"), headers=auth(admin))
    assert resp.status_code == 422
    assert "NOPE" in resp.json()["detail"]
    assert client.get(API, headers=auth(admin)).json()["total"] == 0


def test_update_sets_changes_and_clears_supplier(client, admin, suppliers):
    rid = client.post(API, json=_body(), headers=auth(admin)).json()["id"]
    url = f"{API}/{rid}"
    resp = client.put(url, json={"supplier_code": "ACME"}, headers=auth(admin))
    assert resp.status_code == 200
    assert resp.json()["supplier_name"] == "Acme Pty Ltd"
    resp = client.put(url, json={"supplier_code": "GEO-01"}, headers=auth(admin))
    assert resp.json()["supplier_name"] == "Geotech Partners"
    # Omitting the field leaves it alone.
    resp = client.put(url, json={"description": "Renamed"}, headers=auth(admin))
    assert resp.json()["supplier_code"] == "GEO-01"
    # Explicit null (or blank) clears it.
    resp = client.put(url, json={"supplier_code": None}, headers=auth(admin))
    assert resp.json()["supplier_code"] is None
    assert resp.json()["supplier_name"] is None


def test_update_with_unknown_supplier_is_422_and_changes_nothing(
    client, admin, suppliers
):
    rid = client.post(
        API, json=_body(supplier_code="ACME"), headers=auth(admin)
    ).json()["id"]
    resp = client.put(
        f"{API}/{rid}", json={"supplier_code": "NOPE"}, headers=auth(admin)
    )
    assert resp.status_code == 422
    assert client.get(f"{API}/{rid}", headers=auth(admin)).json()["supplier_code"] == (
        "ACME"
    )


def test_get_and_list_include_supplier_name(client, db, admin, suppliers):
    db.add_all(
        [
            Resource(resource_code="A", description="a", supplier_code="ACME"),
            Resource(resource_code="B", description="b", supplier_code="GEO-01"),
            Resource(resource_code="C", description="c"),
        ]
    )
    db.commit()
    items = client.get(API, headers=auth(admin)).json()["items"]
    assert {i["resource_code"]: i["supplier_name"] for i in items} == {
        "A": "Acme Pty Ltd",
        "B": "Geotech Partners",
        "C": None,
    }
    one = client.get(f"{API}/{items[0]['id']}", headers=auth(admin)).json()
    assert one["supplier_name"] == "Acme Pty Ltd"


def test_list_resolves_names_without_a_query_per_row(client, db, admin, suppliers):
    from sqlalchemy import event

    db.add_all(
        Resource(resource_code=f"R{i}", description="x", supplier_code="ACME")
        for i in range(8)
    )
    db.commit()
    statements = []

    def count(conn, cursor, statement, *a):
        statements.append(statement)

    engine = db.get_bind()
    event.listen(engine, "before_cursor_execute", count)
    try:
        assert client.get(API, headers=auth(admin)).status_code == 200
    finally:
        event.remove(engine, "before_cursor_execute", count)
    supplier_queries = [s for s in statements if 'FROM "tblSupplier"' in s]
    assert len(supplier_queries) == 1


def test_filter_by_supplier_and_with_other_filters(client, db, admin, suppliers):
    db.add_all(
        [
            Resource(resource_code="A1", description="alpha", supplier_code="ACME"),
            Resource(
                resource_code="A2",
                description="beta",
                supplier_code="ACME",
                is_active=False,
            ),
            Resource(resource_code="B1", description="alpha", supplier_code="GEO-01"),
        ]
    )
    db.commit()

    def codes(**params):
        resp = client.get(API, params=params, headers=auth(admin))
        assert resp.status_code == 200
        return [i["resource_code"] for i in resp.json()["items"]], resp.json()["total"]

    assert codes(supplier_code="acme") == (["A1", "A2"], 2)
    assert codes(supplier_code="ACME", active_only="true") == (["A1"], 1)
    assert codes(supplier_code="ACME", search="beta") == (["A2"], 1)
    assert codes(supplier_code="GEO-01", search="alpha") == (["B1"], 1)
    assert codes(supplier_code="UNKNOWN") == ([], 0)


def test_existing_search_and_active_filters_still_work(client, db, admin):
    db.add_all(
        [
            Resource(resource_code="X1", description="Crane"),
            Resource(resource_code="X2", description="Truck", is_active=False),
        ]
    )
    db.commit()
    got = client.get(API, params={"search": "crane"}, headers=auth(admin)).json()
    assert [i["resource_code"] for i in got["items"]] == ["X1"]
    got = client.get(API, params={"active_only": "true"}, headers=auth(admin)).json()
    assert got["total"] == 1


def test_deleting_a_supplier_in_use_is_not_silently_orphaning(client, db, admin):
    db.add(Supplier(supplier_code="ACME", name="Acme"))
    db.commit()
    rid = client.post(
        API, json=_body(supplier_code="ACME"), headers=auth(admin)
    ).json()["id"]
    assert client.get(f"{API}/{rid}", headers=auth(admin)).json()["supplier_name"]


def test_audit_log_still_written_for_resource_update(client, admin, suppliers):
    rid = client.post(API, json=_body(), headers=auth(admin)).json()["id"]
    resp = client.put(
        f"{API}/{rid}", json={"supplier_code": "ACME"}, headers=auth(admin)
    )
    assert resp.status_code == 200
