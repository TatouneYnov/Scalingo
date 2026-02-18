const fs = require('fs');
const path = require('path');

let champions = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'champions.json'), 'utf-8')
);

let currentChampion = null;
let gameId = null;

function initDatabase() {
  console.log(`Loaded ${champions.length} champions`);
  generateNewGameChampion();
}

function getAllChampions() {
  return champions;
}

function getChampionById(id) {
  return champions.find(c => c.id === id);
}

function generateNewGameChampion() {
  const randomIndex = Math.floor(Math.random() * champions.length);
  currentChampion = champions[randomIndex];
  gameId = Math.random().toString(36).substr(2, 9);
  console.log(`New game champion:`, currentChampion.name);
  return currentChampion;
}

function getCurrentChampion() {
  if (!currentChampion) {
    generateNewGameChampion();
  }
  return currentChampion;
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
  compareChampions
};
