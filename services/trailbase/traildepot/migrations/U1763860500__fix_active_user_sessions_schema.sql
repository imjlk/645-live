-- Make active_user_sessions compatible with TrailBase Record API subscriptions.
-- Use INTEGER PRIMARY KEY and keep session_id as a unique logical identifier.

CREATE TABLE active_user_sessions_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    user_agent TEXT,
    connected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    page_path TEXT
) STRICT;

INSERT INTO active_user_sessions_v2 (session_id, user_agent, connected_at, last_seen, page_path)
SELECT session_id, user_agent, connected_at, last_seen, page_path
FROM active_user_sessions;

DROP TABLE active_user_sessions;

ALTER TABLE active_user_sessions_v2 RENAME TO active_user_sessions;

CREATE INDEX IF NOT EXISTS idx_active_user_sessions_session_id
ON active_user_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_active_user_sessions_last_seen
ON active_user_sessions(last_seen);

CREATE INDEX IF NOT EXISTS idx_active_user_sessions_connected_at
ON active_user_sessions(connected_at);
