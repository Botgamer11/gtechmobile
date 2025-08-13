// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Бэкенд в JSON формате
const backend = {
    creatorId: 6595683709, // Ваш Telegram ID
    promoCodes: [],
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
        site: "https://gtech-mobile.com",
        download: "https://gtech-mobile.com/download",
        forum: "https://forum.gtech-mobile.com",
        vkGroup: "https://vk.com/gtech_mobile",
        vkChat: "https://vk.me/join/gtech_chat"
    },
    bonuses: [10, 20, 30, 40, 50, 60, 70, 80, 100],
    users: {},
    admins: []
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
    isAdmin: tg.initDataUnsafe?.user?.id === backend.creatorId || backend.admins.includes(tg.initDataUnsafe?.user?.id)
};

// Загрузка данных
function loadData() {
    const savedData = localStorage.getItem('gtech_backend');
    if (savedData) Object.assign(backend, JSON.parse(savedData));
    
    if (!backend.users[state.user.id]) {
        backend.users[state.user.id] = {
            balance: 0,
            lastBonusDate: null,
            claimedBonuses: []
        };
    }
    Object.assign(state.user, backend.users[state.user.id]);
    
    // Проверка на админа
    state.isAdmin = tg.initDataUnsafe?.user?.id === backend.creatorId || 
                    backend.admins.includes(tg.initDataUnsafe?.user?.id);
}

// Сохранение данных
function saveData() {
    backend.users[state.user.id] = {
        balance: state.user.balance,
        lastBonusDate: state.user.lastBonusDate,
        claimedBonuses: state.user.claimedBonuses
    };
    localStorage.setItem('gtech_backend', JSON.stringify(backend));
}

// Отображение уведомления
function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : ''}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Навигация по страницам
function navigateTo(page) {
    state.currentPage = page;
    render();
    window.scrollTo(0, 0);
}

// Получение бонуса
function claimBonus() {
    const now = new Date();
    const mskTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (3 * 3600000));
    
    if (state.user.lastBonusDate) {
        const lastDate = new Date(state.user.lastBonusDate);
        const lastMsk = new Date(lastDate.getTime() + (lastDate.getTimezoneOffset() * 60000) + (3 * 3600000));
        
        if (mskTime.getDate() === lastMsk.getDate()) {
            showNotification('Вы уже получали бонус сегодня!', true);
            return;
        }
    }
    
    const nextBonus = state.user.claimedBonuses.length + 1;
    if (nextBonus > backend.bonuses.length) {
        showNotification('Вы получили все бонусы!', true);
        return;
    }
    
    const bonusAmount = backend.bonuses[nextBonus - 1];
    state.user.balance += bonusAmount;
    state.user.claimedBonuses.push(nextBonus);
    state.user.lastBonusDate = new Date().toISOString();
    
    showNotification(`Бонус за ${nextBonus} день: +${bonusAmount} монет!`);
    saveData();
    render();
}

// Активация промокода
function activatePromoCode() {
    const code = document.getElementById('promo-input').value;
    if (!code) {
        showNotification('Введите промокод!', true);
        return;
    }
    
    const promo = backend.promoCodes.find(p => p.code === code);
    if (!promo) {
        showNotification('Промокод не найден!', true);
        return;
    }
    
    if (promo.activations <= 0) {
        showNotification('Промокод закончился!', true);
        return;
    }
    
    if (promo.usedBy && promo.usedBy.includes(state.user.id)) {
        showNotification('Вы уже активировали этот промокод!', true);
        return;
    }
    
    state.user.balance += promo.amount;
    promo.activations -= 1;
    
    if (!promo.usedBy) promo.usedBy = [];
    promo.usedBy.push(state.user.id);
    
    showNotification(`Промокод активирован! +${promo.amount} монет`);
    saveData();
    render();
}

// Админ-функции
function updateButtonTexts() {
    backend.buttons.dailyBonus = document.getElementById('btn-daily-bonus').value;
    backend.buttons.getGift = document.getElementById('btn-get-gift').value;
    backend.buttons.community = document.getElementById('btn-community').value;
    backend.buttons.download = document.getElementById('btn-download').value;
    saveData();
    showNotification('Текст кнопок обновлен!');
    navigateTo('main');
}

function updateLinks() {
    backend.links.site = document.getElementById('link-site').value;
    backend.links.download = document.getElementById('link-download').value;
    backend.links.forum = document.getElementById('link-forum').value;
    backend.links.vkGroup = document.getElementById('link-vk-group').value;
    backend.links.vkChat = document.getElementById('link-vk-chat').value;
    saveData();
    showNotification('Ссылки обновлены!');
}

function addPromoCode() {
    const code = document.getElementById('promo-code').value;
    const amount = parseInt(document.getElementById('promo-amount').value);
    const activations = parseInt(document.getElementById('promo-activations').value);
    
    if (!code || isNaN(amount) {
        showNotification('Заполните все поля!', true);
        return;
    }
    
    backend.promoCodes.push({ 
        code, 
        amount,
        activations: activations || 1,
        usedBy: []
    });
    saveData();
    showNotification(`Промокод ${code} на ${amount} монет создан!`);
}

function addAdmin() {
    const adminId = parseInt(document.getElementById('admin-id').value);
    if (isNaN(adminId)) {
        showNotification('Введите корректный ID!', true);
        return;
    }
    
    if (backend.admins.includes(adminId)) {
        showNotification('Этот пользователь уже админ!', true);
        return;
    }
    
    backend.admins.push(adminId);
    saveData();
    showNotification('Админ добавлен!');
}

function removeAdmin() {
    const adminId = parseInt(document.getElementById('admin-id').value);
    if (isNaN(adminId)) {
        showNotification('Введите корректный ID!', true);
        return;
    }
    
    const index = backend.admins.indexOf(adminId);
    if (index === -1) {
        showNotification('Этот пользователь не админ!', true);
        return;
    }
    
    backend.admins.splice(index, 1);
    saveData();
    showNotification('Админ удален!');
}

// Рендер страниц
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
            </div>
            
            <div class="card">
                <h3 class="card-title">${backend.buttons.dailyBonus}</h3>
                <div class="bonus-grid">
                    ${backend.bonuses.map((amount, day) => `
                        <div class="bonus-day ${state.user.claimedBonuses.includes(day + 1) ? 'active' : ''}">
                            ${day + 1} ДЕНЬ
                            <div class="bonus-day-value">${amount}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="card">
                <h3 class="card-title">${backend.buttons.community}</h3>
                <div class="grid">
                    <div class="grid-item" onclick="navigateTo('community')">
                        <div class="grid-item-icon">👥</div>
                        ФОРУМ И ЧАТЫ
                    </div>
                    <div class="grid-item" onclick="window.open('${backend.links.download}', '_blank')">
                        <div class="grid-item-icon">⬇️</div>
                        ${backend.buttons.download}
                    </div>
                </div>
            </div>
        </div>
    `,
    
    admin: `
        <div class="page">
            <button class="btn btn-secondary" onclick="navigateTo('main')">← Назад</button>
            <h2 class="card-title">АДМИН ПАНЕЛЬ</h2>
            
            <div class="card">
                <h3 class="card-title">Текст кнопок</h3>
                <input type="text" class="input-field" id="btn-daily-bonus" placeholder="Ежедневный бонус" value="${backend.buttons.dailyBonus}">
                <input type="text" class="input-field" id="btn-get-gift" placeholder="Получить подарок" value="${backend.buttons.getGift}">
                <input type="text" class="input-field" id="btn-community" placeholder="Сообщество" value="${backend.buttons.community}">
                <input type="text" class="input-field" id="btn-download" placeholder="Скачать игру" value="${backend.buttons.download}">
                <button class="btn btn-primary" onclick="updateButtonTexts()">
                    ОБНОВИТЬ ТЕКСТ КНОПОК
                </button>
            </div>
            
            <div class="card">
                <h3 class="card-title">Ссылки</h3>
                <input type="text" class="input-field" id="link-site" placeholder="Официальный сайт" value="${backend.links.site}">
                <input type="text" class="input-field" id="link-download" placeholder="Скачать игру" value="${backend.links.download}">
                <input type="text" class="input-field" id="link-forum" placeholder="Форум" value="${backend.links.forum}">
                <input type="text" class="input-field" id="link-vk-group" placeholder="Группа ВК" value="${backend.links.vkGroup}">
                <input type="text" class="input-field" id="link-vk-chat" placeholder="Чат ВК" value="${backend.links.vkChat}">
                <button class="btn btn-secondary" onclick="updateLinks()">
                    ОБНОВИТЬ ССЫЛКИ
                </button>
            </div>
            
            <div class="card">
                <h3 class="card-title">Добавить промокод</h3>
                <input type="text" class="input-field" id="promo-code" placeholder="Промокод">
                <input type="number" class="input-field" id="promo-amount" placeholder="Количество монет">
                <input type="number" class="input-field" id="promo-activations" placeholder="Количество активаций" value="1">
                <button class="btn btn-primary" onclick="addPromoCode()">
                    СОЗДАТЬ ПРОМОКОД
                </button>
            </div>
            
            <div class="card">
                <h3 class="card-title">Управление админами</h3>
                <input type="number" class="input-field" id="admin-id" placeholder="Telegram ID пользователя">
                <div class="grid">
                    <button class="btn btn-primary" onclick="addAdmin()">
                        ДОБАВИТЬ АДМИНА
                    </button>
                    <button class="btn btn-secondary" onclick="removeAdmin()">
                        УДАЛИТЬ АДМИНА
                    </button>
                </div>
            </div>
        </div>
    `,
    
    bonus: `
        <div class="page">
            <button class="btn btn-secondary" onclick="navigateTo('main')">← Назад</button>
            <h2 class="card-title">${backend.buttons.dailyBonus}</h2>
            <div class="card">
                <button class="btn btn-primary" onclick="claimBonus()">
                    ${backend.buttons.getGift}
                </button>
            </div>
        </div>
    `,
    
    promo: `
        <div class="page">
            <button class="btn btn-secondary" onclick="navigateTo('main')">← Назад</button>
            <h2 class="card-title">АКТИВАЦИЯ ПРОМОКОДА</h2>
            <div class="card">
                <input type="text" class="input-field" id="promo-input" placeholder="Введите промокод">
                <button class="btn btn-primary" onclick="activatePromoCode()">
                    АКТИВИРОВАТЬ
                </button>
            </div>
        </div>
    `,
    
    top: `
        <div class="page">
            <button class="btn btn-secondary" onclick="navigateTo('main')">← Назад</button>
            <h2 class="card-title">ТОП ИГРОКОВ</h2>
            <div class="card">
                <div class="top-list">
                    ${Object.entries(backend.users)
                        .sort((a, b) => b[1].balance - a[1].balance)
                        .slice(0, 10)
                        .map(([id, user], index) => `
                            <div class="top-item ${id === state.user.id.toString() ? 'current-user' : ''}">
                                <span class="top-position">${index + 1}</span>
                                <span class="top-name">${user.name || `Пользователь ${id}`}</span>
                                <span class="top-balance">${user.balance} монет</span>
                            </div>
                        `).join('')}
                </div>
            </div>
        </div>
    `,
    
    community: `
        <div class="page">
            <button class="btn btn-secondary" onclick="navigateTo('main')">← Назад</button>
            <h2 class="card-title">СООБЩЕСТВО</h2>
            
            <div class="card">
                <h3 class="card-title">ОФИЦИАЛЬНЫЕ РЕСУРСЫ</h3>
                <div class="grid">
                    <div class="grid-item" onclick="window.open('${backend.links.site}', '_blank')">
                        <div class="grid-item-icon site">🌐</div>
                        ОФИЦИАЛЬНЫЙ САЙТ
                    </div>
                    <div class="grid-item" onclick="window.open('${backend.links.forum}', '_blank')">
                        <div class="grid-item-icon forum">💬</div>
                        ФОРУМ
                    </div>
                    <div class="grid-item" onclick="window.open('${backend.links.vkChat}', '_blank')">
                        <div class="grid-item-icon vk">🔵</div>
                        ЧАТ ВКОНТАКТЕ
                    </div>
                    <div class="grid-item" onclick="window.open('${backend.links.vkGroup}', '_blank')">
                        <div class="grid-item-icon vk">👥</div>
                        ГРУППА ВКОНТАКТЕ
                    </div>
                </div>
            </div>
        </div>
    `
};

// Рендер текущей страницы
function render() {
    const app = document.getElementById('app');
    app.innerHTML = pages[state.currentPage] || pages.main;
    saveData();
}

// Инициализация приложения
function initApp() {
    loadData();
    render();
    tg.ready();
    
    tg.onEvent('viewportChanged', () => tg.expand());
}

initApp();