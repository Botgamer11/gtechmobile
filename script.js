// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Бэкенд в JSON формате
const backend = {
    creatorId: 6595683709, // Заменить на ваш Telegram ID
    admins: [6595683709], // Массив ID администраторов (первый - создатель)
    promoCodes: [],
    buttons: {
        dailyBonus: "ЕЖЕДНЕВНЫЙ БОНУС",
        getGift: "ПОЛУЧИТЬ ПОДАРОК",
        community: "СООБЩЕСТВО",
        download: "СКАЧАТЬ ИГРУ",
        adminPanel: "АДМИН ПАНЕЛЬ"
    },
    links: {
        site: "https://gtech-mobile.com",
        download: "https://gtech-mobile.com/download",
        forum: "https://forum.gtech-mobile.com",
        tgGroup: "https://t.me/gtech_group",
        tgChat: "https://t.me/gtech_chat"
    },
    bonuses: [10, 20, 30, 40, 50, 60, 70, 80, 100],
    users: {}
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
    backend.links.tgGroup = document.getElementById('link-tg-group').value;
    backend.links.tgChat = document.getElementById('link-tg-chat').value;
    saveData();
    showNotification('Ссылки обновлены!');
}

function addPromoCode() {
    const code = document.getElementById('promo-code').value;
    const amount = parseInt(document.getElementById('promo-amount').value);
    
    if (!code || isNaN(amount)) {
        showNotification('Заполните все поля!', true);
        return;
    }
    
    backend.promoCodes.push({ code, amount });
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
        showNotification('Этот пользователь уже администратор!', true);
        return;
    }
    
    backend.admins.push(adminId);
    saveData();
    showNotification(`Пользователь ${adminId} добавлен как администратор`);
    
    // Обновляем статус текущего пользователя
    state.isAdmin = backend.admins.includes(state.user.id);
    render();
}

function removeAdmin() {
    const adminId = parseInt(document.getElementById('admin-id').value);
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
        showNotification('Этот пользователь не администратор!', true);
        return;
    }
    
    backend.admins.splice(index, 1);
    saveData();
    showNotification(`Пользователь ${adminId} удалён из администраторов`);
    
    // Обновляем статус текущего пользователя
    state.isAdmin = backend.admins.includes(state.user.id);
    render();
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
                <div class="balance-value">${state.user.balance} монет</div>
            </div>
            
            <button class="btn btn-primary" onclick="navigateTo('bonus')">
                ${backend.buttons.getGift}
            </button>
            
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
            <a class="back-btn" onclick="navigateTo('main')">← Назад</a>
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
                <input type="text" class="input-field" id="link-tg-group" placeholder="Группа Telegram" value="${backend.links.tgGroup}">
                <input type="text" class="input-field" id="link-tg-chat" placeholder="Чат Telegram" value="${backend.links.tgChat}">
                <button class="btn btn-secondary" onclick="updateLinks()">
                    ОБНОВИТЬ ССЫЛКИ
                </button>
            </div>
            
            <div class="card">
                <h3 class="card-title">Добавить промокод</h3>
                <input type="text" class="input-field" id="promo-code" placeholder="Промокод">
                <input type="number" class="input-field" id="promo-amount" placeholder="Количество монет">
                <button class="btn btn-primary" onclick="addPromoCode()">
                    СОЗДАТЬ ПРОМОКОД
                </button>
            </div>
            
            <div class="card">
                <h3 class="card-title">Управление администраторами</h3>
                <input type="number" class="input-field" id="admin-id" placeholder="ID пользователя">
                <div class="grid">
                    <button class="btn btn-primary" onclick="addAdmin()">
                        ДОБАВИТЬ АДМИНА
                    </button>
                    <button class="btn btn-danger" onclick="removeAdmin()">
                        УДАЛИТЬ АДМИНА
                    </button>
                </div>
                
                <div style="margin-top: 16px;">
                    <h4>Текущие администраторы:</h4>
                    <ul class="admin-list">
                        ${backend.admins.map(id => `
                            <li>
                                ID: ${id} ${id === backend.creatorId ? 
                                    '<span class="creator-badge">(Создатель)</span>' : ''}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        </div>
    `,
    
    bonus: `
        <div class="page">
            <a class="back-btn" onclick="navigateTo('main')">← Назад</a>
            <h2 class="card-title">${backend.buttons.dailyBonus}</h2>
            <div class="card">
                <button class="btn btn-primary" onclick="claimBonus()">
                    ${backend.buttons.getGift}
                </button>
            </div>
        </div>
    `,
    
    community: `
        <div class="page">
            <a class="back-btn" onclick="navigateTo('main')">← Назад</a>
            <h2 class="card-title">СООБЩЕСТВО</h2>
            
            <div class="card">
                <h3 class="card-title">ОФИЦИАЛЬНЫЕ РЕСУРСЫ</h3>
                <div class="grid">
                    <div class="grid-item" onclick="window.open('${backend.links.site}', '_blank')">
                        <div class="grid-item-icon">🌐</div>
                        ОФИЦИАЛЬНЫЙ САЙТ
                    </div>
                    <div class="grid-item" onclick="window.open('${backend.links.forum}', '_blank')">
                        <div class="grid-item-icon">💬</div>
                        ФОРУМ
                    </div>
                    <div class="grid-item" onclick="window.open('${backend.links.tgChat}', '_blank')">
                        <div class="grid-item-icon">📢</div>
                        ЧАТ TELEGRAM
                    </div>
                    <div class="grid-item" onclick="window.open('${backend.links.tgGroup}', '_blank')">
                        <div class="grid-item-icon">👥</div>
                        ГРУППА TELEGRAM
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
