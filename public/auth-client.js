const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const errorMessage = document.getElementById('errorMessage');
const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');
const loginBox = document.querySelector('.auth-box:first-of-type');
const registerBox = document.getElementById('registerBox');

showRegisterLink?.addEventListener('click', (e) => {
    e.preventDefault();
    loginBox.classList.add('hidden');
    registerBox.classList.remove('hidden');
    hideError();
});

showLoginLink?.addEventListener('click', (e) => {
    e.preventDefault();
    registerBox.classList.add('hidden');
    loginBox.classList.remove('hidden');
    hideError();
});

loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showError(data.error || 'Erreur de connexion');
            return;
        }
        
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        window.location.href = '/';
        
    } catch (error) {
        showError('Erreur de connexion. Veuillez réessayer.');
    }
});

registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        showError('Les mots de passe ne correspondent pas');
        return;
    }
    
    if (username.length < 3) {
        showError('Le pseudo doit contenir au moins 3 caractères');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showError(data.error || 'Erreur lors de l\'inscription');
            return;
        }
        
        showError('Inscription réussie ! Connectez-vous maintenant.', 'success');
        
        setTimeout(() => {
            registerBox.classList.add('hidden');
            loginBox.classList.remove('hidden');
        }, 1500);
        
    } catch (error) {
        showError('Erreur lors de l\'inscription. Veuillez réessayer.');
    }
});

function showError(message, type = 'error') {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    
    if (type === 'success') {
        errorMessage.style.background = '#2d5f2e';
        errorMessage.style.borderColor = '#3d7f3e';
    } else {
        errorMessage.style.background = '#5f2d2d';
        errorMessage.style.borderColor = '#7f3d3d';
    }
    
    setTimeout(hideError, 3000);
}

function hideError() {
    errorMessage.classList.add('hidden');
}
