require('dotenv').config();

const express = require('express');
const path = require('path');
const {
  initializeDatabase,
  getAllChampions,
  getChampionById,
  getCurrentChampion,
  getGameId,
  generateNewGameChampion,
  compareChampions,
  setCurrentUser,
  setCurrentMode,
  getDailyChampion,
  getLeaderboard,
  saveDailyScore
} = require('./database');

const app = express();

app.use(express.json());
app.use(express.static('public'));

async function start() {
  await initializeDatabase();
  
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🎮 Loldle server running on http://localhost:${port}`);
  });
}

start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

app.get('/api/champions', async (req, res) => {
  try {
    const champions = await getAllChampions();
    res.json(champions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/set-mode', (req, res) => {
  try {
    const { mode, userId } = req.body;
    if (!['unlimited', 'daily', 'hardcore'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode' });
    }
    setCurrentMode(mode);
    if (userId) setCurrentUser(userId);
    res.json({ success: true, mode });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/daily-leaderboard', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const leaderboard = await getLeaderboard(date);
    res.json({ date, scores: leaderboard });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/daily-score', async (req, res) => {
  try {
    const { userId, attempts } = req.body;
    if (!userId || !attempts) {
      return res.status(400).json({ error: 'Missing userId or attempts' });
    }
    await saveDailyScore(userId, attempts);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/current', async (req, res) => {
  try {
    const current = await getCurrentChampion();
    res.json({ 
      exists: true,
      gameId: await getGameId()
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/guess', async (req, res) => {
  try {
    const { championId } = req.body;
    
    if (!championId) {
      return res.status(400).json({ error: 'Champion ID is required' });
    }

    const guessedChampion = await getChampionById(championId);
    if (!guessedChampion) {
      return res.status(404).json({ error: 'Champion not found' });
    }

    const currentChampion = await getCurrentChampion();
    const comparison = compareChampions(guessedChampion, currentChampion);
    
    const isCorrect = championId === currentChampion.id;
    
    res.json({
      correct: isCorrect,
      comparison,
      ...(isCorrect && { champion: currentChampion })
    });
  } catch (error) {
    console.error('Error processing guess:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/new-game', async (req, res) => {
  try {
    await generateNewGameChampion();
    res.json({ success: true, message: 'New game started', gameId: await getGameId() });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});