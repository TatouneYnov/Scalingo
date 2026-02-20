require('dotenv').config();

const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const {
  initializeDatabase,
  getAllChampions,
  getChampionById,
  getCurrentChampion,
  getGameId,
  generateNewGameChampion,
  compareChampions,
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

// Multer configuration for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'uploads', 'profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

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
    console.error('Daily leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
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

app.post('/api/profile/upload', upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { userId } = req.body;
    if (!userId) {
      // Delete the uploaded file if no userId
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Generate the URL path for the uploaded file
    const pictureUrl = `/uploads/profiles/${req.file.filename}`;
    
    // Update user's profile picture in database
    await updateProfilePicture(userId, pictureUrl);
    
    res.json({ 
      success: true, 
      pictureUrl: pictureUrl 
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
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