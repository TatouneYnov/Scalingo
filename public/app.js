let champions = [];
let guesses = [];
let gameWon = false;
let headerAdded = false;

const searchInput = document.getElementById('championSearch');
const suggestionsDiv = document.getElementById('suggestions');
const guessesDiv = document.getElementById('guesses');
const winMessage = document.getElementById('winMessage');
const winText = document.getElementById('winText');
const newGameBtn = document.getElementById('newGameBtn');

async function init() {
    try {
        const response = await fetch('/api/champions');
        champions = await response.json();
        
        searchInput.disabled = false;
        searchInput.focus();
        
        setupEventListeners();
        
        loadSavedGuesses();
        
    } catch (error) {
        console.error('Failed to initialize game:', error);
        alert('Erreur lors du chargement du jeu. Veuillez rafraîchir la page.');
    }
}

function setupEventListeners() {
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', closeSuggestions);
    newGameBtn.addEventListener('click', startNewGame);
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
        <div class="suggestion-item" data-champion-id="${champ.id}">
            ${champ.name}
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
            body: JSON.stringify({ championId })
        });
        
        const result = await response.json();
        
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
    
    row.innerHTML = `
        <div class="guess-cell">${comp.name}</div>
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

function handleWin(champion) {
    gameWon = true;
    searchInput.disabled = true;
    
    const attempts = guesses.length;
    winText.textContent = `Tu as trouvé ${champion.name} en ${attempts} essai${attempts > 1 ? 's' : ''} !`;
    winMessage.classList.remove('hidden');
    
    saveGameState();
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

function startNewGame() {
    if (confirm('Voulez-vous vraiment recommencer une nouvelle partie ? Votre progression sera perdue.')) {
        fetch('/api/new-game', { method: 'POST' })
            .then(response => {
                if (!response.ok) throw new Error('Erreur serveur');
                return response.json();
            })
            .then(data => {
                localStorage.removeItem('loldle_guesses');
                localStorage.removeItem('loldle_won');
                
                guesses = [];
                gameWon = false;
                headerAdded = false;
                
                guessesDiv.innerHTML = '';
                winMessage.classList.add('hidden');
                searchInput.disabled = false;
                searchInput.value = '';
                searchInput.focus();
            })
            .catch(error => {
                console.error('Erreur lors de la nouvelle partie:', error);
                alert('Erreur lors du démarrage d\'une nouvelle partie');
            });
    }
}

init();
