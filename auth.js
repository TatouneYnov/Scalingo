const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

async function registerUser(username, password) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  
  try {
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, profile_picture, created_at',
      [username, passwordHash]
    );
    
    await pool.query(
      'INSERT INTO user_stats (user_id) VALUES ($1)',
      [result.rows[0].id]
    );
    
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Username already exists');
    }
    throw error;
  }
}

async function loginUser(username, password) {
  const result = await pool.query(
    'SELECT id, username, password_hash, profile_picture FROM users WHERE username = $1',
    [username]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Invalid username or password');
  }
  
  const user = result.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);
  
  if (!isValid) {
    throw new Error('Invalid username or password');
  }
  
  await pool.query(
    'UPDATE users SET last_login = NOW() WHERE id = $1',
    [user.id]
  );
  
  const token = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  
  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      profilePicture: user.profile_picture
    }
  };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

async function getUserProfile(userId) {
  const userResult = await pool.query(
    'SELECT id, username, profile_picture, created_at FROM users WHERE id = $1',
    [userId]
  );
  
  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }
  
  const statsResult = await pool.query(
    'SELECT current_streak, longest_streak, total_daily_wins FROM user_stats WHERE user_id = $1',
    [userId]
  );
  
  return {
    ...userResult.rows[0],
    stats: statsResult.rows[0] || { current_streak: 0, longest_streak: 0, total_daily_wins: 0 }
  };
}

async function updateProfilePicture(userId, pictureUrl) {
  await pool.query(
    'UPDATE users SET profile_picture = $1 WHERE id = $2',
    [pictureUrl, userId]
  );
}

async function updateUserStats(userId, won) {
  const today = new Date().toISOString().split('T')[0];
  
  const statsResult = await pool.query(
    'SELECT current_streak, longest_streak, total_daily_wins, last_daily_win_date FROM user_stats WHERE user_id = $1',
    [userId]
  );
  
  let stats = statsResult.rows[0] || {
    current_streak: 0,
    longest_streak: 0,
    total_daily_wins: 0,
    last_daily_win_date: null
  };
  
  if (won) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (stats.last_daily_win_date === yesterdayStr) {
      stats.current_streak += 1;
    } else if (stats.last_daily_win_date !== today) {
      stats.current_streak = 1;
    }
    
    stats.longest_streak = Math.max(stats.longest_streak, stats.current_streak);
    stats.total_daily_wins += 1;
    
    await pool.query(
      `UPDATE user_stats 
       SET current_streak = $1, longest_streak = $2, total_daily_wins = $3, last_daily_win_date = $4, updated_at = NOW()
       WHERE user_id = $5`,
      [stats.current_streak, stats.longest_streak, stats.total_daily_wins, today, userId]
    );
  }
  
  return stats;
}

async function updateMonthlyScore(userId, attempts) {
  const yearMonth = new Date().toISOString().slice(0, 7);
  
  await pool.query(
    `INSERT INTO monthly_scores (user_id, year_month, total_attempts, games_won)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (user_id, year_month)
     DO UPDATE SET 
       total_attempts = monthly_scores.total_attempts + $3,
       games_won = monthly_scores.games_won + 1,
       updated_at = NOW()`,
    [userId, yearMonth, attempts]
  );
}

function getIsoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

async function updateWeeklyScore(userId, attempts) {
  const yearWeek = getIsoWeekKey(new Date());

  await pool.query(
    `INSERT INTO weekly_scores (user_id, year_week, total_attempts, games_won)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (user_id, year_week)
     DO UPDATE SET 
       total_attempts = weekly_scores.total_attempts + $3,
       games_won = weekly_scores.games_won + 1,
       updated_at = NOW()`,
    [userId, yearWeek, attempts]
  );
}

async function getWeeklyLeaderboard(yearWeek = null) {
  const targetWeek = yearWeek || getIsoWeekKey(new Date());

  const result = await pool.query(
    `SELECT u.username, u.profile_picture, ws.total_attempts, ws.games_won
     FROM weekly_scores ws
     JOIN users u ON ws.user_id = u.id
     WHERE ws.year_week = $1
     ORDER BY ws.total_attempts ASC, ws.games_won DESC
     LIMIT 100`,
    [targetWeek]
  );

  return result.rows;
}

async function getUserMonthlyRank(userId, yearMonth = null) {
  const targetMonth = yearMonth || new Date().toISOString().slice(0, 7);
  
  const result = await pool.query(
    `WITH ranked AS (
      SELECT user_id, total_attempts, games_won,
             ROW_NUMBER() OVER (ORDER BY total_attempts ASC, games_won DESC) as rank
      FROM monthly_scores
      WHERE year_month = $1
    )
    SELECT rank, total_attempts, games_won
    FROM ranked
    WHERE user_id = $2`,
    [targetMonth, userId]
  );
  
  return result.rows[0] || null;
}

module.exports = {
  registerUser,
  loginUser,
  verifyToken,
  getUserProfile,
  updateProfilePicture,
  updateUserStats,
  updateMonthlyScore,
  updateWeeklyScore,
  getUserMonthlyRank,
  getWeeklyLeaderboard
};
