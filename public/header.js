async function setupHeader() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!user || !user.id) {
        window.location.href = '/login.html';
        return;
    }
    
    // Récupérer les infos du profil pour obtenir la photo
    try {
        const response = await fetch(`/api/profile/${user.id}`);
        const profile = await response.json();
        
        let profileHtml = '👤';
        if (profile.profile_picture && profile.profile_picture !== 'default.png') {
            if (profile.profile_picture.startsWith('/uploads/') || profile.profile_picture.startsWith('http')) {
                profileHtml = `<img src="${profile.profile_picture}" style="width: 35px; height: 35px; border-radius: 50%; border: 2px solid #2d9f2d; object-fit: cover;">`;
            }
        }
        
        // Pour les pages qui ont une nav existante
        const navUsername = document.getElementById('navUsername');
        if (navUsername) {
            navUsername.textContent = profile.username;
            
            const userMenu = document.querySelector('.user-menu');
            if (userMenu) {
                // Injecter la photo de profil avant le bouton
                const pic = document.createElement('div');
                pic.innerHTML = profileHtml;
                pic.style.display = 'flex';
                pic.style.alignItems = 'center';
                userMenu.insertBefore(pic, userMenu.querySelector('.logout-btn'));
            }
        }
        
    } catch (error) {
        console.error('Failed to load header:', error);
    }
}

function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('loldle_user');
    localStorage.removeItem('loldle_guesses');
    window.location.href = '/login.html';
}

// Appeler setupHeader automatiquement quand le script est chargé
document.addEventListener('DOMContentLoaded', setupHeader);
