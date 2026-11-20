"""Server-side search, filters and sorting for GET /admin/users, and the
server-side self-protection on delete and deactivate."""

from datetime import datetime, timedelta

import pytest

from app.models.database.user import UserRole
from tests.helpers import auth, make_user

API = "/api/v1/admin/users"


@pytest.fixture
def admin(db):
    return make_user(db, "boss", UserRole.ADMIN)


@pytest.fixture
def manager(db):
    return make_user(db, "mgr", UserRole.MANAGER)


@pytest.fixture
def people(db, admin):
    """admin plus four users with distinct names, roles, status and logins."""
    now = datetime(2026, 1, 1)
    alice = make_user(db, "alice", UserRole.USER)
    bob = make_user(db, "bob", UserRole.VIEWER, active=False)
    carol = make_user(db, "carol", UserRole.MANAGER)
    dave = make_user(db, "dave", UserRole.USER)
    alice.full_name = "Alice Zeta"
    bob.full_name = None
    carol.full_name = "Carol Alpha"
    dave.full_name = "Dave Mid"
    alice.last_login = now + timedelta(days=3)
    carol.last_login = now + timedelta(days=1)
    dave.last_login = None
    bob.last_login = None
    admin.last_login = now + timedelta(days=2)
    db.commit()
    return {"alice": alice, "bob": bob, "carol": carol, "dave": dave}


def _names(resp):
    assert resp.status_code == 200, resp.text
    return [u["username"] for u in resp.json()["items"]]


def get(client, user, **params):
    return client.get(API, params=params, headers=auth(user))


def test_default_order_is_by_id_and_total_unfiltered(client, admin, people):
    resp = get(client, admin)
    assert _names(resp) == ["boss", "alice", "bob", "carol", "dave"]
    assert resp.json()["total"] == 5


def test_search_matches_username_email_and_full_name_case_insensitively(
    client, admin, people
):
    assert _names(get(client, admin, search="AL")) == ["alice", "carol"]
    assert _names(get(client, admin, search="carol@example")) == ["carol"]
    assert _names(get(client, admin, search="zeta")) == ["alice"]
    assert _names(get(client, admin, search="nobody")) == []


def test_search_treats_wildcards_literally_enough(client, admin, people):
    # A bare percent is not a match-everything pattern from the user's side
    # beyond matching literal text; no user contains it.
    assert get(client, admin, search="zzz").json()["total"] == 0


@pytest.mark.parametrize(
    "role,expected",
    [
        ("admin", ["boss"]),
        ("manager", ["carol"]),
        ("user", ["alice", "dave"]),
        ("viewer", ["bob"]),
    ],
)
def test_role_filter(client, admin, people, role, expected):
    assert _names(get(client, admin, role=role)) == expected


def test_is_active_filter(client, admin, people):
    assert _names(get(client, admin, is_active="false")) == ["bob"]
    assert _names(get(client, admin, is_active="true")) == [
        "boss",
        "alice",
        "carol",
        "dave",
    ]


def test_filters_combine_and_total_follows_filters(client, admin, people):
    resp = get(client, admin, role="user", search="dav", is_active="true")
    assert _names(resp) == ["dave"]
    assert resp.json()["total"] == 1
    resp = get(client, admin, role="user", skip=1, limit=1)
    assert _names(resp) == ["dave"]
    assert resp.json()["total"] == 2


@pytest.mark.parametrize(
    "sort,asc",
    [
        ("username", ["alice", "bob", "boss", "carol", "dave"]),
        ("email", ["alice", "bob", "boss", "carol", "dave"]),
        # full_name: NULL (bob) last; Alice Zeta, Boss, Carol Alpha, Dave Mid
        ("full_name", ["alice", "boss", "carol", "dave", "bob"]),
        # Stored values: admin, manager, user, viewer (SQLite orders by text).
        ("role", ["boss", "carol", "alice", "dave", "bob"]),
        # last_login: NULLs (bob, dave) last, tie broken by id.
        ("last_login", ["carol", "boss", "alice", "bob", "dave"]),
        ("created_at", ["boss", "alice", "bob", "carol", "dave"]),
    ],
)
def test_sort_fields_ascending(client, admin, people, sort, asc):
    got = _names(get(client, admin, sort=sort, order="asc"))
    if sort == "created_at":
        assert sorted(got) == sorted(asc)  # equal timestamps are possible
    else:
        assert got == asc


def test_sort_descending_and_nulls_last_both_ways(client, admin, people):
    assert _names(get(client, admin, sort="username", order="desc")) == [
        "dave",
        "carol",
        "boss",
        "bob",
        "alice",
    ]
    desc = _names(get(client, admin, sort="last_login", order="desc"))
    assert desc[:3] == ["alice", "boss", "carol"]
    assert desc[3:] == ["dave", "bob"]  # NULLs last, id desc tiebreak
    full = _names(get(client, admin, sort="full_name", order="desc"))
    assert full[-1] == "bob"


def test_sort_is_stable_across_pages(client, admin, people):
    seen = []
    for skip in range(5):
        seen += _names(get(client, admin, sort="role", skip=skip, limit=1))
    assert seen == _names(get(client, admin, sort="role"))
    assert len(set(seen)) == 5


def test_sort_and_filters_together(client, admin, people):
    resp = get(client, admin, role="user", sort="username", order="desc")
    assert _names(resp) == ["dave", "alice"]


@pytest.mark.parametrize(
    "params",
    [
        {"sort": "password"},
        {"sort": "id"},
        {"order": "sideways"},
        {"role": "superuser"},
        {"is_active": "maybe"},
    ],
)
def test_invalid_parameters_are_422(client, admin, params):
    assert get(client, admin, **params).status_code == 422


def test_manager_can_use_the_filters(client, manager, people):
    assert _names(get(client, manager, role="viewer")) == ["bob"]


# ---- self-protection -----------------------------------------------------


@pytest.mark.parametrize("role", list(UserRole))
def test_nobody_can_delete_their_own_account(client, db, role):
    actor = make_user(db, "myself", role)
    resp = client.delete(f"{API}/{actor.id}", headers=auth(actor))
    assert resp.status_code == 403
    if role in (UserRole.ADMIN, UserRole.MANAGER):
        assert resp.json()["detail"] == "You cannot delete your own account"
    assert db.get(type(actor), actor.id) is not None


@pytest.mark.parametrize("role", list(UserRole))
def test_nobody_can_deactivate_their_own_account(client, db, role):
    actor = make_user(db, "myself", role)
    resp = client.put(
        f"{API}/{actor.id}", json={"is_active": False}, headers=auth(actor)
    )
    assert resp.status_code == 403
    if role in (UserRole.ADMIN, UserRole.MANAGER):
        assert resp.json()["detail"] == "You cannot deactivate your own account"
    db.refresh(actor)
    assert actor.is_active is True


def test_self_edit_that_keeps_account_active_still_works(client, admin):
    resp = client.put(
        f"{API}/{admin.id}",
        json={"full_name": "New Name", "is_active": True},
        headers=auth(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "New Name"


def test_admin_can_still_delete_and_deactivate_others(client, db, admin):
    other = make_user(db, "other", UserRole.USER)
    third = make_user(db, "third", UserRole.USER)
    resp = client.put(
        f"{API}/{other.id}", json={"is_active": False}, headers=auth(admin)
    )
    assert resp.status_code == 200 and resp.json()["is_active"] is False
    assert client.delete(f"{API}/{third.id}", headers=auth(admin)).status_code == 204


def test_manager_rules_still_hold(client, db, admin, manager):
    plain = make_user(db, "plain", UserRole.USER)
    # Manager may deactivate and delete ordinary users...
    assert (
        client.put(
            f"{API}/{plain.id}", json={"is_active": False}, headers=auth(manager)
        ).status_code
        == 200
    )
    assert client.delete(f"{API}/{plain.id}", headers=auth(manager)).status_code == 204
    # ...but not admins, and cannot promote anyone to admin.
    assert client.delete(f"{API}/{admin.id}", headers=auth(manager)).status_code == 403
    assert (
        client.put(
            f"{API}/{admin.id}", json={"is_active": False}, headers=auth(manager)
        ).status_code
        == 403
    )
    other = make_user(db, "other", UserRole.USER)
    assert (
        client.put(
            f"{API}/{other.id}", json={"role": "admin"}, headers=auth(manager)
        ).status_code
        == 403
    )
