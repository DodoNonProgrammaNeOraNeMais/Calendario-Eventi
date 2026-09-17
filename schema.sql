-- Schema del database per il calendario eventi

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_key TEXT,
  start_date TEXT NOT NULL,   -- formato YYYY-MM-DD
  end_date TEXT NOT NULL,     -- formato YYYY-MM-DD (uguale a start_date per eventi di un giorno)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL REFERENCES events(id),
  name TEXT NOT NULL,
  vote_id INTEGER REFERENCES votes(id)  -- valorizzato solo se il partecipante è stato aggiunto in automatico accettando un voto al sondaggio; NULL se inserito a mano dall'admin
);

CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  question TEXT NOT NULL,
  deadline TEXT NOT NULL      -- data/ora ISO, es. 2026-10-01T18:00:00
);

CREATE TABLE IF NOT EXISTS poll_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id TEXT NOT NULL REFERENCES polls(id),
  label TEXT NOT NULL
);

-- Contatore per il rate limiting applicativo su /api/votes (vedi functions/api/votes/index.js).
-- bucket_key e' tipicamente "<azione>:<ip>:<minuto>", es. "vote-post:1.2.3.4:29338521".
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id TEXT NOT NULL REFERENCES polls(id),
  option_id INTEGER NOT NULL REFERENCES poll_options(id),
  voter_token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  voter_name TEXT,            -- nome inserito da chi vota, mostrato nel dettaglio evento e nel pannello admin
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'rejected': decisione dell'admin su questo voto
  UNIQUE(poll_id, voter_token)  -- un solo voto per persona per sondaggio (si aggiorna, non si duplica)
);

CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_participants_event ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_polls_event ON polls(event_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_poll ON votes(poll_id);
