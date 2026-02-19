let currentUser = null;

async function init() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!user || !user.id) {
        window.location.href = '/login.html';
        return;
    }
    
    currentUser = user;
    document.getElementById('navUsername').textContent = user.username;
    
    const now = new Date();
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    document.getElementById('currentMonth').textContent = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    
    await loadLeaderboard();
}

async function loadLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard/monthly');
        const data = await response.json();
        
        const tbody = document.getElementById('leaderboardBody');
        
        if (data.leaderboard.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #999;">
                        Aucun score pour ce mois
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = data.leaderboard.map((player, index) => {
            const average = (player.total_attempts / player.games_won).toFixed(1);
            const isCurrentUser = player.username === currentUser.username;
            const rowStyle = isCurrentUser ? 'background: #2d5f2e33; border-left: 3px solid #2d9f2d;' : '';
            
            let rankDisplay = `#${index + 1}`;
            if (index === 0) rankDisplay = '🥇';
            else if (index === 1) rankDisplay = '🥈';
            else if (index === 2) rankDisplay = '🥉';
            
            return `
                <tr style="${rowStyle} border-bottom: 1px solid #333;">
                    <td style="padding: 15px; font-weight: bold; font-size: 1.2rem;">${rankDisplay}</td>
                    <td style="padding: 15px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 35px; height: 35px; border-radius: 50%; background: #1a1a1a; border: 2px solid #2d9f2d; display: flex; align-items: center; justify-content: center;">
                                ${player.profile_picture || '👤'}
                            </div>
                            <span style="font-weight: ${isCurrentUser ? 'bold' : 'normal'}; color: ${isCurrentUser ? '#2d9f2d' : '#e0e0e0'};">
                                ${player.username} ${isCurrentUser ? '(Vous)' : ''}
                            </span>
                        </div>
                    </td>
                    <td style="padding: 15px; text-align: center; font-weight: bold; color: #8b6914;">${player.total_attempts}</td>
                    <td style="padding: 15px; text-align: center; color: #2d9f2d;">${player.games_won}</td>
                    <td style="padding: 15px; text-align: center; color: #999;">${average}</td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
    }
}

function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

init();
