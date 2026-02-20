const pool = require('./db');

let currentUserId = null;
let currentMode = 'unlimited';

async function initializeDatabase() {
  try {
    const migrations = `
      ALTER TABLE games ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'unlimited' NOT NULL;
      ALTER TABLE games ADD COLUMN IF NOT EXISTS date_key TEXT;
      
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
      
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        profile_picture TEXT DEFAULT 'default.png',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login TIMESTAMPTZ
      );
      
      CREATE TABLE IF NOT EXISTS user_stats (
        user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        total_daily_wins INTEGER DEFAULT 0,
        last_daily_win_date TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS monthly_scores (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        year_month TEXT NOT NULL,
        total_attempts INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, year_month)
      );

      CREATE TABLE IF NOT EXISTS weekly_scores (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        year_week TEXT NOT NULL,
        total_attempts INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, year_week)
      );
      
      ALTER TABLE daily_scores ADD COLUMN IF NOT EXISTS user_id_fk BIGINT REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE champions ADD COLUMN IF NOT EXISTS image_url TEXT;
      
      CREATE INDEX IF NOT EXISTS idx_games_mode ON games(mode);
      CREATE INDEX IF NOT EXISTS idx_games_date_key ON games(date_key);
      CREATE INDEX IF NOT EXISTS idx_daily_scores_date ON daily_scores(date);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_monthly_scores_year_month ON monthly_scores(year_month);
      CREATE INDEX IF NOT EXISTS idx_monthly_scores_user_id ON monthly_scores(user_id);
      CREATE INDEX IF NOT EXISTS idx_weekly_scores_year_week ON weekly_scores(year_week);
      CREATE INDEX IF NOT EXISTS idx_weekly_scores_user_id ON weekly_scores(user_id);
    `;
    
    await pool.query(migrations);
    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
  }
}

function setCurrentUser(userId) {
  currentUserId = userId;
}

function setCurrentMode(mode) {
  currentMode = mode;
}

function mapChampionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    resource: row.resource,
    genre: row.genre,
    skinCount: row.skin_count,
    gender: row.gender,
    attackType: row.attack_type,
    releaseDate: row.release_date,
    region: row.region,
    lane: row.lane,
    imageUrl: row.image_url
  };
}

async function getAllChampions() {
  const result = await pool.query(
    'SELECT id, name, title, resource, genre, skin_count, gender, attack_type, release_date, region, lane, image_url FROM champions'
  );
  return result.rows.map(mapChampionRow);
}

async function getChampionById(id) {
  const result = await pool.query(
    'SELECT id, name, title, resource, genre, skin_count, gender, attack_type, release_date, region, lane, image_url FROM champions WHERE id = $1',
    [id]
  );
  return mapChampionRow(result.rows[0]);
}

async function createNewGame() {
  let championId;
  
  if (currentMode === 'daily') {
    const today = new Date().toISOString().split('T')[0];
    const dailyResult = await pool.query(
      'SELECT champion_id FROM daily_challenge WHERE date = $1',
      [today]
    );
    
    if (dailyResult.rows.length === 0) {
      const randResult = await pool.query('SELECT id FROM champions ORDER BY RANDOM() LIMIT 1');
      championId = randResult.rows[0]?.id;
      await pool.query(
        'INSERT INTO daily_challenge (date, champion_id) VALUES ($1, $2)',
        [today, championId]
      );
    } else {
      championId = dailyResult.rows[0].champion_id;
    }
  } else {
    const champResult = await pool.query('SELECT id FROM champions ORDER BY RANDOM() LIMIT 1');
    championId = champResult.rows[0]?.id;
  }
  
  if (!championId) {
    throw new Error('No champions available');
  }

  const newGameId = Math.random().toString(36).slice(2, 11);
  const dateKey = currentMode === 'daily' ? new Date().toISOString().split('T')[0] : null;
  const userId = currentUserId || 'anonymous';
  
  await pool.query(
    'INSERT INTO games (id, target_champion_id, mode, date_key) VALUES ($1, $2, $3, $4)',
    [newGameId, championId, currentMode, dateKey]
  );

  return { id: newGameId, targetChampionId: championId };
}

async function ensureCurrentGame() {
  const result = await pool.query(
    'SELECT id, target_champion_id FROM games ORDER BY created_at DESC LIMIT 1'
  );
  if (result.rows.length === 0) {
    return createNewGame();
  }
  return {
    id: result.rows[0].id,
    targetChampionId: result.rows[0].target_champion_id
  };
}

async function getCurrentChampion() {
  const game = await ensureCurrentGame();
  return getChampionById(game.targetChampionId);
}

async function getGameId() {
  const game = await ensureCurrentGame();
  return game.id;
}

async function generateNewGameChampion() {
  const game = await createNewGame();
  return getChampionById(game.targetChampionId);
}

function compareChampions(guess, target) {
  const result = {
    name: guess.name,
    gender: compareField(guess.gender, target.gender),
    attackType: compareField(guess.attackType, target.attackType),
    releaseDate: compareYear(guess.releaseDate, target.releaseDate),
    region: compareField(guess.region, target.region),
    lane: compareLane(guess.lane, target.lane),
    genre: compareGenre(guess.genre, target.genre)
  };
  return result;
}

function compareField(guessValue, targetValue) {
  return {
    value: guessValue,
    match: guessValue === targetValue ? 'correct' : 'incorrect'
  };
}

function compareYear(guessYear, targetYear) {
  let match = 'incorrect';
  let direction = null;
  
  if (guessYear === targetYear) {
    match = 'correct';
  } else if (Math.abs(guessYear - targetYear) <= 2) {
    match = 'close';
    direction = guessYear < targetYear ? 'higher' : 'lower';
  } else {
    direction = guessYear < targetYear ? 'higher' : 'lower';
  }
  
  return {
    value: guessYear,
    match,
    direction
  };
}

function compareLane(guessLane, targetLane) {
  const guessLanes = guessLane.split(',');
  const targetLanes = targetLane.split(',');
  
  const hasCommon = guessLanes.some(lane => targetLanes.includes(lane));
  const isExact = guessLane === targetLane;
  
  return {
    value: guessLane,
    match: isExact ? 'correct' : (hasCommon ? 'partial' : 'incorrect')
  };
}

function compareGenre(guessGenre, targetGenre) {
  const guessGenres = guessGenre.split(',');
  const targetGenres = targetGenre.split(',');
  
  const hasCommon = guessGenres.some(genre => targetGenres.includes(genre));
  const isExact = guessGenre === targetGenre;
  
  return {
    value: guessGenre,
    match: isExact ? 'correct' : (hasCommon ? 'partial' : 'incorrect')
  };
}

async function getLeaderboard(date = null) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  try {
    const result = await pool.query(
      `SELECT ds.user_id, ds.attempts, ds.completed_at, 
              COALESCE(u.username, 'Unknown User') as username
       FROM daily_scores ds 
       LEFT JOIN users u ON ds.user_id::BIGINT = u.id 
       WHERE ds.date = $1 
       ORDER BY ds.attempts ASC, ds.completed_at ASC`,
      [targetDate]
    );
    return result.rows;
  } catch (error) {
    console.error('Error in getLeaderboard:', error.message);
    throw error;
  }
}

async function saveDailyScore(userId, attempts) {
  const today = new Date().toISOString().split('T')[0];
  await pool.query(
    'INSERT INTO daily_scores (date, user_id, attempts) VALUES ($1, $2, $3) ON CONFLICT (date, user_id) DO UPDATE SET attempts = $3',
    [today, userId, attempts]
  );
}

async function hasPlayedToday(userId) {
  const today = new Date().toISOString().split('T')[0];
  const result = await pool.query(
    'SELECT attempts FROM daily_scores WHERE date = $1 AND user_id = $2',
    [today, userId]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

module.exports = {
  initializeDatabase,
  getAllChampions,
  getChampionById,
  getCurrentChampion,
  generateNewGameChampion,
  getGameId,
  compareChampions,
  setCurrentUser,
  setCurrentMode,
  getLeaderboard,
  saveDailyScore,
  hasPlayedToday
};
