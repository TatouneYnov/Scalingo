const profilePictures = [
    'default.png',
    '🎮', '🏆', '⭐', '🔥', '💎', '👑', '🎯', '🚀',
    '🦁', '🐉', '🦅', '🐺', '🐅', '🦈', '🦎', '🐢'
];

let currentUser = null;

async function init() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!user || !user.id) {
        window.location.href = '/login.html';
        return;
    }
    
    currentUser = user;
    document.getElementById('navUsername').textContent = user.username;
    
    await loadProfile();
    renderProfilePictures();
}

async function loadProfile() {
    try {
        const response = await fetch(`/api/profile/${currentUser.id}`);
        const profile = await response.json();
        
        document.getElementById('profileUsername').textContent = profile.username;
        document.getElementById('joinedDate').textContent = new Date(profile.created_at).toLocaleDateString('fr-FR');
        
        const stats = profile.stats || {};
        document.getElementById('currentStreak').textContent = stats.current_streak || 0;
        document.getElementById('longestStreak').textContent = stats.longest_streak || 0;
        document.getElementById('totalWins').textContent = stats.total_daily_wins || 0;
        
        if (profile.monthlyRank) {
            document.getElementById('monthlyRank').textContent = `#${profile.monthlyRank.rank}`;
        }
        
        const pictureEl = document.getElementById('profilePicture');
        if (profile.profile_picture && profile.profile_picture !== 'default.png') {
            pictureEl.textContent = profile.profile_picture;
        }
        
    } catch (error) {
        console.error('Failed to load profile:', error);
    }
}

function renderProfilePictures() {
    const grid = document.getElementById('profilePicturesGrid');
    
    grid.innerHTML = profilePictures.map(pic => `
        <div class="profile-pic-option" data-pic="${pic}" onclick="selectProfilePicture('${pic}')">
            ${pic}
        </div>
    `).join('');
}

async function selectProfilePicture(picture) {
    try {
        const response = await fetch('/api/profile/picture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, pictureUrl: picture })
        });
        
        if (response.ok) {
            document.getElementById('profilePicture').textContent = picture;
            
            currentUser.profilePicture = picture;
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            document.querySelectorAll('.profile-pic-option').forEach(el => {
                el.classList.remove('selected');
            });
            document.querySelector(`[data-pic="${picture}"]`).classList.add('selected');
        }
        
    } catch (error) {
        console.error('Failed to update profile picture:', error);
    }
}

function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

init();
