const tg = window.Telegram.WebApp;
let userData = {};

// Инициализация
function init() {
    tg.expand();
    loadUserData();
    
    // Проверка админских прав
    if (tg.initDataUnsafe.user?.id === 6595683709) { // Замените на ваш ID
        document.getElementById('admin-btn').style.display = 'block';
        document.getElementById('admin-btn').addEventListener('click', () => {
            window.location.href = 'admin.html';
        });
    }
}

// Загрузка данных пользователя
async function loadUserData() {
    try {
        const response = await fetch('/api/user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tg.initDataUnsafe)
        });
        userData = await response.json();
        
        document.getElementById('username').textContent = userData.name;
        document.getElementById('balance').textContent = userData.balance;
        document.getElementById('tickets').textContent = userData.tickets;
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

// Активация промокода
async function activatePromo(code) {
    const response = await fetch('/api/promo/activate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId: userData.id,
            code: code
        })
    });
    const result = await response.json();
    return result;
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', init);