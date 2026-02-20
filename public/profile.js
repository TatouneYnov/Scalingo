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
    
    // Setup file input listener
    const fileInput = document.getElementById('customPictureInput');
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            uploadCustomPicture(e.target.files[0]);
        }
    });
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
            // Afficher les images base64 ou uploadées
            if (profile.profile_picture.startsWith('data:image/') || profile.profile_picture.startsWith('/uploads/') || profile.profile_picture.startsWith('http')) {
                pictureEl.innerHTML = `<img src="${profile.profile_picture}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                // Icône par défaut pour tout le reste
                pictureEl.innerHTML = '<span style="font-size: 48px; color: #666;">👤</span>';
            }
        } else {
            // Icône par défaut
            pictureEl.innerHTML = '<span style="font-size: 48px; color: #666;">👤</span>';
        }
        
    } catch (error) {
        console.error('Failed to load profile:', error);
    }
}

async function uploadCustomPicture(file) {
    const statusEl = document.getElementById('uploadStatus');
    
    if (!file) {
        statusEl.textContent = 'Aucun fichier sélectionné';
        statusEl.style.color = '#ff6b6b';
        return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        statusEl.textContent = 'Fichier trop volumineux (max 5 MB)';
        statusEl.style.color = '#ff6b6b';
        return;
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        statusEl.textContent = 'Type de fichier invalide';
        statusEl.style.color = '#ff6b6b';
        return;
    }
    
    statusEl.textContent = 'Téléchargement...';
    statusEl.style.color = '#999';
    
    try {
        // Convert image to base64
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        
        const imageBase64 = await base64Promise;
        
        const response = await fetch('/api/profile/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                imageBase64: imageBase64
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            statusEl.textContent = '✓ Image téléchargée avec succès !';
            statusEl.style.color = '#2d9f2d';
            
            // Update profile picture display
            const pictureEl = document.getElementById('profilePicture');
            pictureEl.innerHTML = `<img src="${data.pictureUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            
            // Update localStorage
            currentUser.profilePicture = data.pictureUrl;
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            // Clear input
            document.getElementById('customPictureInput').value = '';
            
        } else {
            statusEl.textContent = '✗ Erreur: ' + (data.error || 'Échec du téléchargement');
            statusEl.style.color = '#ff6b6b';
        }
        
    } catch (error) {
        console.error('Upload failed:', error);
        statusEl.textContent = '✗ Erreur de téléchargement';
        statusEl.style.color = '#ff6b6b';
    }
}

function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

init();
