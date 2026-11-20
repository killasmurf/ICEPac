# Database migrations

The schema is managed with Alembic (`alembic/`). The history is linear apart
from one empty, merged side branch, and has a single head:

```
a41d9a15aea8 -> b7e2f3a1c9d4 -> 002_admin_tables -> 003_project_import
  -> 004_wbs_approval_status -> 005_report_tables -> 006_project_level_risks
  -> 007_merge_legacy_branch -> 008_resource_supplier (head)
a41d9a15aea8 -> 002_remaining_tables (empty, merged by 007)
```

Alembic reads the database URL from `DATABASE_URL` (see `app/core/config.py`,
which also reads `.env`). Use the `psycopg2` driver explicitly if your
SQLAlchemy is 2.1 or newer (`postgresql+psycopg2://...`); `requirements.txt`
pins SQLAlchemy below 2.1, where plain `postgresql://` means psycopg2.

## Fresh database

```bash
createdb icepac
export DATABASE_URL=postgresql+psycopg2://user:password@localhost/icepac
alembic upgrade head      # builds the whole schema and the reference/seed rows
alembic check             # must print "No new upgrade operations detected."
```

## Everyday commands

```bash
alembic current                       # revision the database is at
alembic heads                         # must list exactly one head
alembic upgrade head                  # apply pending migrations
alembic downgrade base && alembic upgrade head   # full round trip
alembic revision --autogenerate -m "describe change"   # then review the file
```

When you change a model, generate a migration and run `alembic check`
afterwards; CI runs the same comparison against PostgreSQL
(`tests/test_migrations.py`). Note the comparison covers tables, columns,
types, nullability, indexes and foreign keys, but not server defaults.

## Existing local databases

There is no production database yet, so these steps only affect developers'
local data.

| Your database `alembic current` says | What to do |
| --- | --- |
| nothing / no database | Fresh database, above. |
| `006_project_level_risks` (the old mainline head) or `007_merge_legacy_branch` | `alembic upgrade head`. From 006 this records the merge (no schema change), then `008_resource_supplier` adds the nullable `supplier_code` column (with a foreign key to `tblSupplier`) to `tblResource`. Tested. |
| `002_remaining_tables` (the old second head) | It cannot be upgraded in place: that migration created older, different table definitions. **Drop and recreate the database** (local dev data is lost): `dropdb icepac && createdb icepac && alembic upgrade head`. If you run `alembic upgrade head` against it anyway, `002_admin_tables` aborts with a clear message and the transaction is rolled back, leaving the database untouched. Tested. |
| built with `create_all` (no `alembic_version`) | Either recreate as above, or keep the data and run `alembic stamp head`, then `alembic check`. The stamped schema comes from the models, so it has no seed rows. Tested. |

Migrations `a41d9a15aea8`, `002_admin_tables`, `003_project_import`,
`005_report_tables` and `006_project_level_risks` were edited in place because
they could not run on PostgreSQL before (the `userrole` type created twice,
unquoted `tbl...` identifiers in seed/backfill SQL, a foreign key to a
non-existent `users` table), so no PostgreSQL database can exist at those
revisions from the old files.

## Enum columns

`User.role`, `Project.status`, `Project.source_format` and `ImportJob.status`
use `values_callable`, so the ORM stores the enum *values* (`'draft'`),
which are what the PostgreSQL enum types contain. Any new `Enum` column must do
the same, and the migration must create the type with the same values.
