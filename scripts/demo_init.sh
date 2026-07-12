#!/bin/sh
set -e
echo "[demo-init] running alembic migrations..."

# Handle legacy alembic_version from old images. PR #11 renamed
# the "add project-level risk fields" migration from "1c6e862ab27f"
# to "006_project_level_risks". DBs that were stamped with the OLD
# identifier (1c6e862ab27f) need to be re-stamped to the current chain
# before `alembic upgrade head` can find the head.
#
# If the DB is at a current-chain revision, this is a no-op.
# If it's at a known legacy identifier, stamp to the new chain's
# start (b7e2f3a1c9d4 = add_help_tables), and let upgrade head
# apply all the new migrations.
#
# Use grep to find the legacy identifier in alembic's output (the
# version is shown in error messages and on a successful current).
CURRENT_OUT=$(alembic current 2>&1)
if echo "$CURRENT_OUT" | grep -qE "(1c6e862ab27f|^$)"; then
  echo "[demo-init] detected legacy alembic_version ($CURRENT_OUT); stamping to b7e2f3a1c9d4 (add_help_tables)"
  alembic stamp b7e2f3a1c9d4
fi
alembic upgrade head
echo "[demo-init] seeding admin user..."
python /app/scripts/seed_admin.py
# Note: scripts/seed_demo.py was archived in this branch. To
# populate the demo DB with the 500+ rows of test data, run the
# showcase or restore seed_demo.py from _archive/.
echo "[demo-init] done. (showcase: docker exec demo-app python /app/scripts/seed_report_showcase.py)"
