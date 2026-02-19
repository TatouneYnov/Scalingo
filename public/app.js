let champions = [];
let guesses = [];
let gameWon = false;
let headerAdded = false;
let currentGameId = null;
let currentMode = 'unlimited';
let currentUserId = null;
let currentUser = null;

const searchInput = document.getElementById('championSearch');
const suggestionsDiv = document.getElementById('suggestions');
const guessesDiv = document.getElementById('guesses');
const winMessage = document.getElementById('winMessage');
const winText = document.getElementById('winText');
const newGameBtn = document.getElementById('newGameBtn');
const modeSelector = document.getElementById('modeSelector');
const leaderboard = document.getElementById('leaderboard');

async function init() {
    try {
        currentUser = JSON.parse(localStorage.getItem('user') || 'null');
        
        if (!currentUser || !currentUser.id) {
            window.location.href = '/login.html';
            return;
        }
        
        currentUserId = currentUser.id;
        
        setupNavBar();
        
        const response = await fetch('/api/champions');
        champions = await response.json();
        
        const stored = JSON.parse(localStorage.getItem('loldle_user') || '{}');
        currentMode = stored.mode;
        
        setupEventListeners();
        
        if (!currentMode) {
            showModeSelector();
        } else if (currentMode === 'unlimited') {
            startGame();
            loadSavedGuesses();
        } else if (currentMode === 'daily') {
            await checkDailyStatus();
            loadLeaderboard();
        }
        
    } catch (error) {
        console.error('Failed to initialize game:', error);
        alert('Erreur lors du chargement du jeu.');
    }
}

function setupNavBar() {
    const header = document.querySelector('header');
    const navBar = document.createElement('div');
    navBar.className = 'nav-bar';
    navBar.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 10px 0;';
    navBar.innerHTML = `
        <div class="nav-links" style="display: flex; gap: 20px;">
            <a href="/" style="color: #2d9f2d; text-decoration: none; font-weight: bold;">🎮 Jouer</a>
            <a href="/leaderboard.html" style="color: #e0e0e0; text-decoration: none;">🏆 Classement</a>
            <a href="/profile.html" style="color: #e0e0e0; text-decoration: none;">👤 Profil</a>
        </div>
        <div style="display: flex; align-items: center; gap: 15px;">
            <span style="color: #999;">${currentUser.username}</span>
            <button onclick="logout()" style="background: #5f2d2d; color: #e0e0e0; border: 1px solid #7f3d3d; padding: 6px 12px; border-radius: 6px; cursor: pointer;">Déconnexion</button>
        </div>
    `;
    header.insertBefore(navBar, header.firstChild);
}

function showModeSelector() {
    modeSelector.classList.remove('hidden');
}

async function selectMode(mode) {
    currentMode = mode;
    localStorage.setItem('loldle_user', JSON.stringify({ mode: currentMode, userId: currentUserId }));
    
    await fetch('/api/set-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, userId: currentUserId })
    });
    
    guessesDiv.innerHTML = '';
    headerAdded = false;
    guesses = [];
    gameWon = false;
    searchInput.value = '';
    searchInput.disabled = false;
    
    if (mode === 'daily') {
        // Vérifier si l'utilisateur a déjà joué aujourd'hui avant de lancer
        await checkDailyStatus();
        loadLeaderboard();
    } else {
        await startGame();
    }
}

async function loadLeaderboard() {
    try {
        const response = await fetch('/api/daily-leaderboard');
        const data = await response.json();
        
        const leaderboardList = document.getElementById('leaderboardList');
        if (data.scores.length === 0) {
            leaderboardList.innerHTML = '<p>Aucun score pour aujourd\'hui</p>';
        } else {
            leaderboardList.innerHTML = data.scores.map((score, i) => `
                <div class="leaderboard-entry">
                    <span class="rank">#${i + 1}</span>
                    <span class="user">${score.user_id}</span>
                    <span class="attempts">${score.attempts} essai${score.attempts > 1 ? 's' : ''}</span>
                </div>
            `).join('');
        }
        leaderboard.classList.remove('hidden');
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
    }
}

async function checkDailyStatus() {
    try {
        const response = await fetch(`/api/daily-status?userId=${currentUserId}`);
        const data = await response.json();
        
        if (data.hasPlayed) {
            // L'utilisateur a déjà joué aujourd'hui
            gameWon = true;
            searchInput.disabled = true;
            winText.innerHTML = `Tu as déjà joué aujourd'hui ! Tu as trouvé le champion en ${data.attempts} essai${data.attempts > 1 ? 's' : ''}.<br><br>Clique sur "Nouvelle partie" pour jouer en mode illimité ! 🎮`;
            winMessage.classList.remove('hidden');
            
            // Charger les tentatives sauvegardées pour afficher le résultat
            loadSavedGuesses();
        } else {
            // L'utilisateur peut jouer
            startGame();
            loadSavedGuesses();
        }
    } catch (error) {
        console.error('Failed to check daily status:', error);
        // En cas d'erreur, on laisse jouer
        startGame();
        loadSavedGuesses();
    }
}

async function startGame() {
    try {
        await fetch('/api/new-game', { method: 'POST' });
        const response = await fetch('/api/current');
        const current = await response.json();
        currentGameId = current.gameId;
        
        searchInput.disabled = false;
        searchInput.focus();
        
    } catch (error) {
        console.error('Error starting game:', error);
    }
}

function setupEventListeners() {
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', closeSuggestions);
    newGameBtn.addEventListener('click', startNewGame);
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
        if (btn.dataset.mode !== 'hardcore') {
            btn.addEventListener('click', () => selectMode(btn.dataset.mode));
        }
    });
}

function handleSearchInput(e) {
    const query = e.target.value.toLowerCase().trim();
    
    if (query.length === 0) {
        suggestionsDiv.classList.remove('show');
        return;
    }
    
    const filtered = champions.filter(champ => 
        champ.name.toLowerCase().includes(query) &&
        !guesses.some(g => g.comparison.name === champ.name)
    ).slice(0, 10);
    
    if (filtered.length > 0) {
        displaySuggestions(filtered);
    } else {
        suggestionsDiv.classList.remove('show');
    }
}

function handleKeyDown(e) {
    if (e.key === 'Enter') {
        const firstSuggestion = suggestionsDiv.querySelector('.suggestion-item');
        if (firstSuggestion) {
            const championId = firstSuggestion.dataset.championId;
            selectChampion(championId);
        }
    }
}

function displaySuggestions(filtered) {
    suggestionsDiv.innerHTML = filtered.map(champ => `
        <div class="suggestion-item" data-champion-id="${champ.id}" style="display: flex; align-items: center; gap: 10px;">
            <img src="${champ.imageUrl || `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${champ.id}.png`}" 
                 style="width: 35px; height: 35px; border-radius: 4px;" 
                 onerror="this.style.display='none'">
            <span>${champ.name}</span>
        </div>
    `).join('');
    
    suggestionsDiv.classList.add('show');
    
    suggestionsDiv.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            selectChampion(item.dataset.championId);
        });
    });
}

function closeSuggestions(e) {
    if (!suggestionsDiv.contains(e.target) && e.target !== searchInput) {
        suggestionsDiv.classList.remove('show');
    }
}

async function selectChampion(championId) {
    if (gameWon) return;
    
    const champ = champions.find(c => c.id == championId);
    if (guesses.some(g => g.comparison.name === champ.name)) {
        alert('Tu as déjà essayé ce champion !');
        return;
    }
    
    try {
        const response = await fetch('/api/guess', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                championId,
                userId: currentUserId,
                mode: currentMode
            })
        });
        
        const result = await response.json();
        
        // Vérifier si l'utilisateur a déjà joué aujourd'hui
        if (result.alreadyPlayed) {
            alert(result.error || 'Tu as déjà joué le daily aujourd\'hui !');
            // Recharger la page pour afficher le statut correct
            window.location.reload();
            return;
        }
        
        guesses.unshift(result);
        saveGuesses();
        
        searchInput.value = '';
        suggestionsDiv.classList.remove('show');
        
        addLatestGuess();
        
        if (result.correct) {
            handleWin(result.champion);
        }
        
    } catch (error) {
        console.error('Error submitting guess:', error);
        alert('Erreur lors de la soumission de la réponse.');
    }
}

function addLatestGuess() {
    if (!headerAdded) {
        guessesDiv.innerHTML = `
            <div class="guess-header">
                <div class="guess-header-cell">Champion</div>
                <div class="guess-header-cell">Genre</div>
                <div class="guess-header-cell">Sexe</div>
                <div class="guess-header-cell">Portée</div>
                <div class="guess-header-cell">Année</div>
                <div class="guess-header-cell">Région</div>
                <div class="guess-header-cell">Lane</div>
            </div>
        `;
        headerAdded = true;
    }
    
    const header = guessesDiv.querySelector('.guess-header');
    const row = createGuessRow(guesses[0]);
    if (header) {
        header.after(row);
    } else {
        guessesDiv.appendChild(row);
    }
}

function displayGuesses() {
    if (!headerAdded && guesses.length > 0) {
        guessesDiv.innerHTML = `
            <div class="guess-header">
                <div class="guess-header-cell">Champion</div>
                <div class="guess-header-cell">Genre</div>
                <div class="guess-header-cell">Sexe</div>
                <div class="guess-header-cell">Portée</div>
                <div class="guess-header-cell">Année</div>
                <div class="guess-header-cell">Région</div>
                <div class="guess-header-cell">Lane</div>
            </div>
        `;
        headerAdded = true;
    }
    
    guesses.forEach(guess => {
        const row = createGuessRow(guess);
        guessesDiv.appendChild(row);
    });
}

function createGuessRow(guess) {
    const row = document.createElement('div');
    row.className = 'guess-row';
    
    const comp = guess.comparison;
    const championId = guess.champion?.id || comp.name.replace(/[^a-zA-Z]/g, '');
    const imageUrl = guess.champion?.imageUrl || `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${championId}.png`;
    
    row.innerHTML = `
        <div class="guess-cell" style="display: flex; align-items: center; gap: 8px; justify-content: center;">
            <img src="${imageUrl}" 
                 style="width: 30px; height: 30px; border-radius: 4px;" 
                 onerror="this.style.display='none'">
            <span>${comp.name}</span>
        </div>
        <div class="guess-cell ${comp.genre.match}">${formatGenre(comp.genre.value)}</div>
        <div class="guess-cell ${comp.gender.match}">${translateGender(comp.gender.value)}</div>
        <div class="guess-cell ${comp.attackType.match}">${translateAttackType(comp.attackType.value)}</div>
        <div class="guess-cell ${comp.releaseDate.match}">
            ${comp.releaseDate.value}
            ${comp.releaseDate.direction ? `<span class="direction-arrow">${comp.releaseDate.direction === 'higher' ? '↑' : '↓'}</span>` : ''}
        </div>
        <div class="guess-cell ${comp.region.match}">${translateRegion(comp.region.value)}</div>
        <div class="guess-cell ${comp.lane.match}">${translateLane(comp.lane.value)}</div>
    `;
    
    return row;
}

async function handleWin(champion) {
    gameWon = true;
    searchInput.disabled = true;
    
    const attempts = guesses.length;
    winText.textContent = `Tu as trouvé ${champion.name} en ${attempts} essai${attempts > 1 ? 's' : ''} !`;
    winMessage.classList.remove('hidden');
    
    saveGameState();
    
    if (currentMode === 'daily') {
        await fetch('/api/daily-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, attempts })
        });
        loadLeaderboard();
    }
}

function formatGenre(genre) {
    return genre.split(',').map(g => translateGenre(g)).join(', ');
}

function translateGenre(genre) {
    const translations = {
        'Fighter': 'Combattant',
        'Mage': 'Mage',
        'Assassin': 'Assassin',
        'Tank': 'Tank',
        'Marksman': 'Tireur',
        'Support': 'Support'
    };
    return translations[genre] || genre;
}

function translateGender(gender) {
    const translations = {
        'male': 'Homme',
        'female': 'Femme',
        'divers': 'Autre'
    };
    return translations[gender] || gender;
}

function translateAttackType(type) {
    return type === 'close' ? 'Mêlée' : 'Distance';
}

function translateRegion(region) {
    const translations = {
        'demacia': 'Demacia',
        'noxus': 'Noxus',
        'freljord': 'Freljord',
        'ionia': 'Ionia',
        'piltover': 'Piltover',
        'zaun': 'Zaun',
        'bilgewater': 'Bilgewater',
        'shurima': 'Shurima',
        'mount-targon': 'Mont Targon',
        'shadow-isles': 'Îles Ombreuses',
        'void': 'Void',
        'ixtal': 'Ixtal',
        'bandle-city': 'Bandle City',
        'runeterra': 'Runeterra'
    };
    return translations[region] || region;
}

function translateLane(lane) {
    const translations = {
        'top': 'Top',
        'jungle': 'Jungle',
        'mid': 'Mid',
        'bottom': 'Bot',
        'support': 'Support'
    };
    return lane.split(',').map(l => translations[l.trim()] || l).join(', ');
}

function saveGuesses() {
    localStorage.setItem('loldle_guesses', JSON.stringify(guesses));
}

function loadSavedGuesses() {
    const saved = localStorage.getItem('loldle_guesses');
    
    if (saved) {
        guesses = JSON.parse(saved);
        displayGuesses();
        
        if (guesses.length > 0 && guesses[0].correct) {
            handleWin(guesses[0].champion);
        }
    }
}

function saveGameState() {
    localStorage.setItem('loldle_won', 'true');
}

async function startNewGame() {
    // En mode daily, on a déjà joué aujourd'hui, on permet de changer de mode
    if (currentMode === 'daily' && gameWon) {
        // Réinitialiser pour choisir un autre mode
        localStorage.removeItem('loldle_guesses');
        localStorage.removeItem('loldle_won');
        
        guesses = [];
        gameWon = false;
        headerAdded = false;
        
        guessesDiv.innerHTML = '';
        winMessage.classList.add('hidden');
        searchInput.disabled = true;
        searchInput.value = '';
        leaderboard.classList.add('hidden');
        
        showModeSelector();
        return;
    }
    
    if (confirm('Voulez-vous vraiment recommencer une nouvelle partie ?')) {
        localStorage.removeItem('loldle_guesses');
        localStorage.removeItem('loldle_won');
        
        guesses = [];
        gameWon = false;
        headerAdded = false;
        
        guessesDiv.innerHTML = '';
        winMessage.classList.add('hidden');
        searchInput.disabled = true;
        searchInput.value = '';
        leaderboard.classList.add('hidden');
        
        showModeSelector();
    }
}

function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('loldle_user');
    localStorage.removeItem('loldle_guesses');
    window.location.href = '/login.html';
}

init();
