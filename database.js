const pool = require('./db');

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
    lane: row.lane
  };
}

async function initDatabase() {
  await ensureCurrentGame();
}

async function getAllChampions() {
  const result = await pool.query(
    'SELECT id, name, title, resource, genre, skin_count, gender, attack_type, release_date, region, lane FROM champions'
  );
  return result.rows.map(mapChampionRow);
}

async function getChampionById(id) {
  const result = await pool.query(
    'SELECT id, name, title, resource, genre, skin_count, gender, attack_type, release_date, region, lane FROM champions WHERE id = $1',
    [id]
  );
  return mapChampionRow(result.rows[0]);
}

async function createNewGame() {
  const champResult = await pool.query('SELECT id FROM champions ORDER BY RANDOM() LIMIT 1');
  const championId = champResult.rows[0]?.id;
  if (!championId) {
    throw new Error('No champions available');
  }

  const newGameId = Math.random().toString(36).slice(2, 11);
  await pool.query(
    'INSERT INTO games (id, target_champion_id) VALUES ($1, $2)',
    [newGameId, championId]
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

module.exports = {
  initDatabase,
  getAllChampions,
  getChampionById,
  getCurrentChampion,
  generateNewGameChampion,
  getGameId,
  compareChampions
};
