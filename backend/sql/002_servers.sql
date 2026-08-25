CREATE TABLE IF NOT EXISTS servers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  invite_code VARCHAR(16) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A user's role is per-server, not global: Alice can be Owner of server A
-- and Member of server B. That's why role lives on the join table, not on users.
CREATE TYPE server_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE IF NOT EXISTS server_members (
  server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role server_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (server_id, user_id)
);

-- DB-level guarantee for the rule "no more than one owner on a server" —
-- even if the app has a bug, Postgres itself refuses a second owner row.
CREATE UNIQUE INDEX IF NOT EXISTS one_owner_per_server
  ON server_members (server_id)
  WHERE role = 'owner';
