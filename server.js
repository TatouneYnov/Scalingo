require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
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
  getLeaderboard,
  saveDailyScore,
  hasPlayedToday
} = require('./database');

const {
  registerUser,
  loginUser,
  verifyToken,
  getUserProfile,
  updateProfilePicture,
  updateUserStats,
  updateMonthlyScore,
  updateWeeklyScore,
  getWeeklyLeaderboard,
  getUserMonthlyRank
} = require('./auth');

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
    console.log('Fetching leaderboard for date:', date);
    const leaderboard = await getLeaderboard(date);
    console.log('Leaderboard data:', leaderboard);
    res.json({ date, scores: leaderboard });
  } catch (error) {
    console.error('Error in /api/daily-leaderboard:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.get('/api/daily-status', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    
    const playedData = await hasPlayedToday(userId);
    res.json({ 
      hasPlayed: !!playedData,
      attempts: playedData ? playedData.attempts : null
    });
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
    
    // Update user stats and monthly score if authenticated user
    if (!isNaN(userId)) {
      await updateUserStats(parseInt(userId), true);
      await updateMonthlyScore(parseInt(userId), attempts);
      await updateWeeklyScore(parseInt(userId), attempts);
    }
    
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
    const { championId, userId, mode } = req.body;
    
    if (!championId) {
      return res.status(400).json({ error: 'Champion ID is required' });
    }

    // Vérifier si l'utilisateur essaie de tricher en mode daily
    if (mode === 'daily' && userId) {
      const playedData = await hasPlayedToday(userId);
      if (playedData) {
        return res.status(403).json({ 
          error: 'Tu as déjà joué le daily aujourd\'hui !',
          alreadyPlayed: true,
          attempts: playedData.attempts
        });
      }
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
      champion: guessedChampion,
      ...(isCorrect && { answer: currentChampion })
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

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const user = await registerUser(username, password);
    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const result = await loginUser(username, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.get('/api/profile/:userId', async (req, res) => {
  try {
    const profile = await getUserProfile(req.params.userId);
    const monthlyRank = await getUserMonthlyRank(req.params.userId);
    res.json({ ...profile, monthlyRank });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.post('/api/profile/picture', async (req, res) => {
  try {
    const { userId, pictureUrl } = req.body;
    await updateProfilePicture(userId, pictureUrl);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile picture' });
  }
});

app.post('/api/profile/upload', async (req, res) => {
  try {
    const { userId, imageBase64 } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image data provided' });
    }
    
    // Validate base64 format
    if (!imageBase64.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format' });
    }
    
    // Check size (base64 is ~33% larger, so 6.5MB base64 = ~5MB original)
    if (imageBase64.length > 6.5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large (max 5MB)' });
    }
    
    // Update user's profile picture in database with base64
    await updateProfilePicture(userId, imageBase64);
    
    res.json({ 
      success: true, 
      pictureUrl: imageBase64 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

app.get('/api/leaderboard/weekly', async (req, res) => {
  try {
    const yearWeek = req.query.week;
    const leaderboard = await getWeeklyLeaderboard(yearWeek);
    res.json({ leaderboard, week: yearWeek || null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Route de test - génère du trafic visible dans les métriques
app.get('/api/test', async (req, res) => {
  const count = parseInt(req.query.count) || 10;
  console.log(`📊 [TEST] Starting ${count} requests...`);
  
  for (let i = 0; i < count; i++) {
    console.log(`📊 [TEST] Request ${i + 1}/${count} - Timestamp: ${new Date().toISOString()}`);
  }
  
  console.log(`✅ [TEST] Completed ${count} requests - Check metrics!`);
  res.json({ status: 'ok', count, message: 'Check metrics for activity spike' });
});