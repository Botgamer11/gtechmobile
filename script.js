// Инициализация Telegram WebApp
const tg = window.Telegram?.WebApp || {
    initDataUnsafe: { user: { id: 123456, first_name: 'Тестовый' } },
    expand: () => console.log('Telegram WebApp expanded'),
    ready: () => console.log('Telegram WebApp ready'),
    onEvent: () => {}
};

// Базовые данные
const backend = {
    creatorId: 6595683709,
    buttons: {
        dailyBonus: "ЕЖЕДНЕВНЫЙ БОНУС",
        getGift: "ПОЛУЧИТЬ ПОДАРОК",
        community: "СООБЩЕСТВО",
        download: "СКАЧАТЬ ИГРУ",
        adminPanel: "АДМИН ПАНЕЛЬ",
        topUsers: "ТОП ИГРОКОВ",
        enterPromo: "АКТИВИРОВАТЬ ПРОМОКОД"
    },
    links: {
        community: "https://t.me/yourcommunity",
        download: "https://yourgame.com/download"
    },
    bonuses: [10, 20, 30, 40, 50, 60, 70, 80, 100],
    users: {},
    promoCodes: [],
    admins: [6595683709] // Массив ID администраторов
};

// Состояние приложения
const state = {
    user: {
        id: tg.initDataUnsafe?.user?.id || 0,
        name: tg.initDataUnsafe?.user?.first_name || 'Гость',
        balance: 0,
        lastBonusDate: null,
        claimedBonuses: []
    },
    currentPage: 'main',
    isAdmin: backend.admins.includes(tg.initDataUnsafe?.user?.id)
};

// Подключение к MySQL (это пример, в реальности нужно серверное API)
async function queryDatabase(sql, params = []) {
    try {
        const response = await fetch('https://your-backend-api.com/db', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sql, params })
        });
        return await response.json();
    } catch (error) {
        console.error('Database error:', error);
        return { error: 'Database connection failed' };
    }
}

// Загрузка данных
async function loadData() {
    // Попробуем загрузить из локального хранилища
    const savedData = localStorage.getItem('gtech_data');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            Object.assign(backend, data);
        } catch (e) {
            console.error('Ошибка загрузки данных:', e);
        }
    }

    // Загрузка из базы данных (пример)
    try {
        const dbData = await queryDatabase('SELECT * FROM app_settings WHERE id = 1');
        if (dbData && !dbData.error) {
            Object.assign(backend, dbData);
        }
    } catch (e) {
        console.error('Ошибка загрузки из БД:', e);
    }

    if (!backend.users[state.user.id]) {
        backend.users[state.user.id] = {
            balance: 100,
            lastBonusDate: null,
            claimedBonuses: []
        };
    }

    Object.assign(state.user, backend.users[state.user.id]);
    state.isAdmin = backend.admins.includes(tg.initDataUnsafe?.user?.id);
}

// Сохранение данных
async function saveData() {
    backend.users[state.user.id] = {
        balance: state.user.balance,
        lastBonusDate: state.user.lastBonusDate,
        claimedBonuses: state.user.claimedBonuses
    };
    
    localStorage.setItem('gtech_data', JSON.stringify(backend));
    
    // Сохранение в базу данных (пример)
    try {
        await queryDatabase('UPDATE app_settings SET ? WHERE id = 1', [backend]);
    } catch (e) {
        console.error('Ошибка сохранения в БД:', e);
    }
}

// Уведомления
function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : ''}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Навигация
function navigateTo(page) {
    state.currentPage = page;
    render();
    window.scrollTo(0, 0);
}

// Система бонусов
async function claimBonus() {
    const today = new Date().toDateString();
    if (state.user.lastBonusDate === today) {
        showNotification('Вы уже получали бонус сегодня!', true);
        return;
    }

    const nextDay = state.user.claimedBonuses.length + 1;
    if (nextDay > backend.bonuses.length) {
        showNotification('Бонусы закончились!', true);
        return;
    }

    const bonus = backend.bonuses[nextDay - 1];
    state.user.balance += bonus;
    state.user.claimedBonuses.push(nextDay);
    state.user.lastBonusDate = today;

    showNotification(`Бонус за ${nextDay} день: +${bonus} монет!`);
    await saveData();
    render();
}

// Промокоды
async function activatePromo() {
    const codeInput = document.getElementById('promo-code-input');
    if (!codeInput) return;

    const code = codeInput.value.trim();
    if (!code) {
        showNotification('Введите промокод!', true);
        return;
    }

    const promo = backend.promoCodes.find(p => p.code === code);
    if (!promo) {
        showNotification('Неверный промокод!', true);
        return;
    }

    state.user.balance += promo.amount;
    showNotification(`Промокод активирован! +${promo.amount} монет`);
    codeInput.value = '';
    await saveData();
    render();
}

// Админ-функции
async function addPromoCode() {
    const code = document.getElementById('new-promo-code').value.trim();
    const amount = parseInt(document.getElementById('new-promo-amount').value);
    
    if (!code || isNaN(amount)) {
        showNotification('Заполните все поля!', true);
        return;
    }
    
    backend.promoCodes.push({ code, amount });
    await saveData();
    showNotification(`Промокод "${code}" создан!`);
    document.getElementById('new-promo-code').value = '';
    document.getElementById('new-promo-amount').value = '';
}

async function updateButtonText() {
    const buttonId = document.getElementById('button-select').value;
    const newText = document.getElementById('button-text-input').value.trim();
    
    if (!newText) {
        showNotification('Введите текст!', true);
        return;
    }
    
    backend.buttons[buttonId] = newText;
    await saveData();
    showNotification('Текст кнопки обновлен!');
    render();
}

async function updateLink() {
    const linkId = document.getElementById('link-select').value;
    const newLink = document.getElementById('link-input').value.trim();
    
    if (!newLink) {
        showNotification('Введите ссылку!', true);
        return;
    }
    
    backend.links[linkId] = newLink;
    await saveData();
    showNotification('Ссылка обновлена!');
}

async function addAdmin() {
    const adminId = parseInt(document.getElementById('new-admin-id').value);
    
    if (isNaN(adminId)) {
        showNotification('Введите корректный ID!', true);
        return;
    }
    
    if (backend.admins.includes(adminId)) {
        showNotification('Этот пользователь уже администратор!', true);
        return;
    }
    
    backend.admins.push(adminId);
    await saveData();
    showNotification('Администратор добавлен!');
    document.getElementById('new-admin-id').value = '';
    state.isAdmin = backend.admins.includes(tg.initDataUnsafe?.user?.id);
}

async function removeAdmin() {
    const adminId = parseInt(document.getElementById('remove-admin-id').value);
    
    if (isNaN(adminId)) {
        showNotification('Введите корректный ID!', true);
        return;
    }
    
    if (adminId === backend.creatorId) {
        showNotification('Нельзя удалить создателя!', true);
        return;
    }
    
    const index = backend.admins.indexOf(adminId);
    if (index === -1) {
        showNotification('Пользователь не является администратором!', true);
        return;
    }
    
    backend.admins.splice(index, 1);
    await saveData();
    showNotification('Администратор удален!');
    document.getElementById('remove-admin-id').value = '';
    state.isAdmin = backend.admins.includes(tg.initDataUnsafe?.user?.id);
}

// Шаблоны страниц
const pages = {
    main: `
        <div class="page">
            <div class="header">
                <h1>Gtech Mobile</h1>
            </div>
            
            ${state.isAdmin ? `
                <div class="admin-panel">
                    <button class="btn btn-secondary" onclick="navigateTo('admin')">
                        ${backend.buttons.adminPanel}
                    </button>
                </div>
            ` : ''}
            
            <div class="user-card">
                <div class="user-name">${state.user.name}</div>
                <div class="balance-container">
                    <div class="balance-value">${state.user.balance}</div>
                    <div class="balance-label">МОНЕТ</div>
                </div>
            </div>
            
            <div class="buttons-container">
                <button class="btn btn-primary" onclick="navigateTo('bonus')">
                    ${backend.buttons.getGift}
                </button>
                
                <button class="btn btn-secondary" onclick="navigateTo('promo')">
                    ${backend.buttons.enterPromo}
                </button>
                
                <button class="btn btn-vk" onclick="navigateTo('top')">
                    ${backend.buttons.topUsers}
                </button>
                
                <a href="${backend.links.community}" class="btn btn-secondary" target="_blank">
                    ${backend.buttons.community}
                </a>
                
                <a href="${backend.links.download}" class="btn btn-primary" target="_blank">
                    ${backend.buttons.download}
                </a>
            </div>
            
            <div class="card">
                <h3 class="card-title">${backend.buttons.dailyBonus}</h3>
                <div class="bonus-grid">
                    ${backend.bonuses.map((amount, i) => `
                        <div class="bonus-day ${state.user.claimedBonuses.includes(i + 1) ? 'active' : ''}">
                            ${i + 1} ДЕНЬ
                            <div class="bonus-day-value">${amount}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `,
    
    bonus: `
        <div class="page">
            <button class="btn btn-secondary" onclick="navigateTo('main')">← Назад</button>
            <h2 class="card-title">${backend.buttons.getGift}</h2>
            <div class="card">
                <button class="btn btn-primary" onclick="claimBonus()">
                    ПОЛУЧИТЬ БОНУС
                </button>
            </div>
        </div>
    `,
    
    promo: `
        <div class="page">
            <button class="btn btn-secondary" onclick="navigateTo('main')">← Назад</button>
            <h2 class="card-title">${backend.buttons.enterPromo}</h2>
            <div class="card">
                <input type="text" id="promo-code-input" class="input-field" placeholder="Введите промокод">
                <button class="btn btn-primary" onclick="activatePromo()">
                    АКТИВИРОВАТЬ
                </button>
            </div>
        </div>
    `,
    
    top: `
        <div class="page">
            <button class="btn btn-secondary" onclick="navigateTo('main')">← Назад</button>
            <h2 class="card-title">${backend.buttons.topUsers}</h2>
            <div class="card">
                <div class="top-list">
                    ${Object.entries(backend.users)
                        .sort((a, b) => b[1].balance - a[1].balance)
                        .slice(0, 50) // Показываем топ-50 игроков
                        .map(([id, user], index) => `
                            <div class="top-item ${id === state.user.id.toString() ? 'current-user' : ''}">
                                <span class="top-pos">${index + 1}.</span>
                                <span class="top-name">${user.name || `Игрок ${id.slice(0, 4)}`}</span>
                                <span class="top-balance">${user.balance} монет</span>
                            </div>
                        `).join('')}
                </div>
            </div>
        </div>
    `,
    
    admin: `
        <div class="page">
            <button class="btn btn-secondary" onclick="navigateTo('main')">← Назад</button>
            <h2 class="card-title">${backend.buttons.adminPanel}</h2>
            
            <div class="card">
                <h3 class="card-title">Управление кнопками</h3>
                <select id="button-select" class="input-field">
                    ${Object.keys(backend.buttons).map(key => `
                        <option value="${key}">${key}</option>
                    `).join('')}
                </select>
                <input type="text" id="button-text-input" class="input-field" placeholder="Новый текст">
                <button class="btn btn-primary" onclick="updateButtonText()">
                    ОБНОВИТЬ ТЕКСТ
                </button>
            </div>
            
            <div class="card">
                <h3 class="card-title">Управление ссылками</h3>
                <select id="link-select" class="input-field">
                    ${Object.keys(backend.links).map(key => `
                        <option value="${key}">${key}</option>
                    `).join('')}
                </select>
                <input type="text" id="link-input" class="input-field" placeholder="Новая ссылка">
                <button class="btn btn-primary" onclick="updateLink()">
                    ОБНОВИТЬ ССЫЛКУ
                </button>
            </div>
            
            <div class="card">
                <h3 class="card-title">Добавить промокод</h3>
                <input type="text" id="new-promo-code" class="input-field" placeholder="Промокод">
                <input type="number" id="new-promo-amount" class="input-field" placeholder="Количество монет">
                <button class="btn btn-primary" onclick="addPromoCode()">
                    СОЗДАТЬ ПРОМОКОД
                </button>
            </div>
            
            <div class="card">
                <h3 class="card-title">Управление администраторами</h3>
                <input type="number" id="new-admin-id" class="input-field" placeholder="ID нового админа">
                <button class="btn btn-primary" onclick="addAdmin()">
                    ДОБАВИТЬ АДМИНА
                </button>
                <input type="number" id="remove-admin-id" class="input-field" placeholder="ID админа для удаления">
                <button class="btn btn-danger" onclick="removeAdmin()">
                    УДАЛИТЬ АДМИНА
                </button>
            </div>
        </div>
    `
};

// Рендер приложения
function render() {
    const app = document.getElementById('app');
    app.innerHTML = pages[state.currentPage] || pages.main;
}

// Инициализация
async function initApp() {
    await loadData();
    render();
    tg.expand();
    tg.ready();
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);