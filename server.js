const express = require('express');
const path = require('path');
const {
  initDatabase,
  getAllChampions,
  getChampionById,
  getDailyChampion,
  compareChampions
} = require('./database');

const app = express();

app.use(express.json());
app.use(express.static('public'));

initDatabase();

app.get('/api/champions', (req, res) => {
  try {
    const champions = getAllChampions();
    res.json(champions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/daily', (req, res) => {
  try {
    const daily = getDailyChampion();
    res.json({ 
      exists: true,
      date: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/guess', (req, res) => {
  try {
    const { championId } = req.body;
    
    if (!championId) {
      return res.status(400).json({ error: 'Champion ID is required' });
    }

    const guessedChampion = getChampionById(championId);
    if (!guessedChampion) {
      return res.status(404).json({ error: 'Champion not found' });
    }

    const dailyChampion = getDailyChampion();
    const comparison = compareChampions(guessedChampion, dailyChampion);
    
    const isCorrect = championId === dailyChampion.id;
    
    res.json({
      correct: isCorrect,
      comparison,
      ...(isCorrect && { champion: dailyChampion })
    });
  } catch (error) {
    console.error('Error processing guess:', error);
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