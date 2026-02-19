-- Users table with authentication
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  profile_picture TEXT DEFAULT 'default.png',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- User statistics
CREATE TABLE IF NOT EXISTS user_stats (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_daily_wins INTEGER DEFAULT 0,
  last_daily_win_date TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly leaderboard (points = total attempts in month)
CREATE TABLE IF NOT EXISTS monthly_scores (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL, -- Format: YYYY-MM
  total_attempts INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year_month)
);

-- Update daily_scores to reference users table
ALTER TABLE daily_scores ADD COLUMN IF NOT EXISTS user_id_fk BIGINT REFERENCES users(id) ON DELETE CASCADE;

-- Champion images
ALTER TABLE champions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_monthly_scores_year_month ON monthly_scores(year_month);
CREATE INDEX IF NOT EXISTS idx_monthly_scores_user_id ON monthly_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
