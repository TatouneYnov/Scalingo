ALTER TABLE games ADD COLUMN mode TEXT DEFAULT 'unlimited' NOT NULL;
ALTER TABLE games ADD COLUMN date_key TEXT;

CREATE TABLE IF NOT EXISTS daily_challenge (
  date TEXT PRIMARY KEY,
  champion_id TEXT NOT NULL REFERENCES champions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_scores (
  id BIGSERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  user_id TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_games_mode ON games(mode);
CREATE INDEX IF NOT EXISTS idx_games_date_key ON games(date_key);
CREATE INDEX IF NOT EXISTS idx_daily_scores_date ON daily_scores(date);
