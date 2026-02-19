require('dotenv').config();

const express = require('express');
const path = require('path');
const {
  initDatabase,
  getAllChampions,
  getChampionById,
  getCurrentChampion,
  getGameId,
  generateNewGameChampion,
  compareChampions
} = require('./database');

const app = express();

app.use(express.json());
app.use(express.static('public'));

initDatabase().catch(error => {
  console.error('Database init failed:', error);
});

app.get('/api/champions', async (req, res) => {
  try {
    const champions = await getAllChampions();
    res.json(champions);
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🎮 Loldle server running on http://localhost:${port}`);
});