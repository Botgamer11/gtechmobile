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
        adminPanel: "АДМИН ПАНЕЛЬ"
    },
    links: {
        site: "https://gtech-mobile.com",
        download: "https://gtech-mobile.com/download",
        forum: "https://forum.gtech-mobile.com",
        vkGroup: "https://vk.com/gtech_mobile",
        vkChat: "https://vk.me/join/gtech_chat"
    },
    bonuses: [5, 10, 15, 15, 15, 15, 15, 15, 15], // Бонусы как на скриншоте
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
    isAdmin: tg.initDataUnsafe?.user?.id === backend.creatorId
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

// Получение бонуса (обновленная версия)
function claimBonus() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    // Проверка, получал ли пользователь бонус сегодня
    if (state.user.lastBonusDate) {
        const lastDate = new Date(state.user.lastBonusDate);
        const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()).getTime();
        
        if (today === lastDay) {
            showNotification('Вы уже получали бонус сегодня!', true);
            return;
        }
    }
    
    // Определение следующего бонуса
    const nextBonusDay = state.user.claimedBonuses.length + 1;
    if (nextBonusDay > backend.bonuses.length) {
        showNotification('Вы получили все бонусы!', true);
        return;
    }
    
    // Зачисление бонуса
    const bonusAmount = backend.bonuses[nextBonusDay - 1];
    state.user.balance += bonusAmount;
    state.user.claimedBonuses.push(nextBonusDay);
    state.user.lastBonusDate = new Date().toISOString();
    
    showNotification(`Бонус за ${nextBonusDay} день: +${bonusAmount} монет!`);
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
    
    if (!code || isNaN(amount)) {
        showNotification('Заполните все поля!', true);
        return;
    }
    
    backend.promoCodes.push({ code, amount });
    saveData();
    showNotification(`Промокод ${code} на ${amount} монет создан!`);
}

// Рендер страниц
const pages = {
    main: `
        <div class="page">
            <div class="header">
                <h1>Gtech Mobile</h1>
            </div>
            
            <div class="user-card">
                <div class="user-avatar">${state.user.name.charAt(0)}</div>
                <div class="user-name">${state.user.name}</div>
                <div class="balance">${state.user.balance} монет</div>
            </div>
            
            <button class="btn" onclick="navigateTo('bonus')">
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
                        ФОРУМ И ЧАТЫ
                    </div>
                    <div class="grid-item" onclick="window.open('${backend.links.download}', '_blank')">
                        ${backend.buttons.download}
                    </div>
                </div>
            </div>
            
            ${state.isAdmin ? `
                <div class="admin-panel">
                    <button class="btn btn-secondary" onclick="navigateTo('admin')">
                        ${backend.buttons.adminPanel}
                    </button>
                </div>
            ` : ''}
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
                <button class="btn" onclick="updateButtonTexts()">
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
                <button class="btn" onclick="updateLinks()">
                    ОБНОВИТЬ ССЫЛКИ
                </button>
            </div>
            
            <div class="card">
                <h3 class="card-title">Добавить промокод</h3>
                <input type="text" class="input-field" id="promo-code" placeholder="Промокод">
                <input type="number" class="input-field" id="promo-amount" placeholder="Количество монет">
                <button class="btn" onclick="addPromoCode()">
                    СОЗДАТЬ ПРОМОКОД
                </button>
            </div>
        </div>
    `,
    
    bonus: `
        <div class="page">
            <a class="back-btn" onclick="navigateTo('main')">← Назад</a>
            <h2 class="card-title">${backend.buttons.dailyBonus}</h2>
            <div class="card">
                <button class="btn" onclick="claimBonus()">
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
                        ОФИЦИАЛЬНЫЙ САЙТ
                    </div>
                    <div class="grid-item" onclick="window.open('${backend.links.forum}', '_blank')">
                        ФОРУМ
                    </div>
                    <div class="grid-item" onclick="window.open('${backend.links.vkChat}', '_blank')">
                        ЧАТ ВКОНТАКТЕ
                    </div>
                    <div class="grid-item" onclick="window.open('${backend.links.vkGroup}', '_blank')">
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