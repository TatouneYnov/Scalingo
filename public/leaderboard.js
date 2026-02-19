let currentUser = null;
let currentWeekStart = null;

async function init() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!user || !user.id) {
        window.location.href = '/login.html';
        return;
    }
    
    currentUser = user;
    document.getElementById('navUsername').textContent = user.username;

    currentWeekStart = getWeekStart(new Date());
    bindWeekNavigation();
    await loadLeaderboard(currentWeekStart);
}

function bindWeekNavigation() {
    const prevBtn = document.getElementById('prevWeekBtn');
    const nextBtn = document.getElementById('nextWeekBtn');

    prevBtn.addEventListener('click', () => {
        currentWeekStart = addDays(currentWeekStart, -7);
        loadLeaderboard(currentWeekStart);
    });

    nextBtn.addEventListener('click', () => {
        currentWeekStart = addDays(currentWeekStart, 7);
        loadLeaderboard(currentWeekStart);
    });
}

function addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
}

function getWeekStart(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = (d.getDay() + 6) % 7; // Monday=0
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getIsoWeekKey(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function formatWeekLabel(weekStart) {
    const weekEnd = addDays(weekStart, 6);
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const startLabel = `${weekStart.getDate()} ${monthNames[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
    const endLabel = `${weekEnd.getDate()} ${monthNames[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
    return `${startLabel} - ${endLabel}`;
}

async function loadLeaderboard(weekStart) {
    try {
        const weekKey = getIsoWeekKey(weekStart);
        const response = await fetch(`/api/leaderboard/weekly?week=${weekKey}`);
        const data = await response.json();

        const weekLabel = document.getElementById('currentWeek');
        weekLabel.textContent = `Semaine ${weekKey.replace('-', ' ')} | ${formatWeekLabel(weekStart)}`;
        
        const tbody = document.getElementById('leaderboardBody');
        
        if (data.leaderboard.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #999;">
                        Aucun score pour cette semaine
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
            
            // Afficher l'image de profil si disponible, sinon un avatar par défaut
            const isImageUrl = player.profile_picture && (
                player.profile_picture.startsWith('http') || 
                player.profile_picture.startsWith('/uploads/')
            );
            const profilePictureContent = isImageUrl
                ? `<img src="${player.profile_picture}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.style.display='none'">` 
                : '<span style="font-size: 18px; color: #666;">👤</span>';
            
            return `
                <tr style="${rowStyle} border-bottom: 1px solid #333;">
                    <td style="padding: 15px; font-weight: bold; font-size: 1.2rem;">${rankDisplay}</td>
                    <td style="padding: 15px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 35px; height: 35px; border-radius: 50%; background: #1a1a1a; border: 2px solid #2d9f2d; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                                ${profilePictureContent}
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
