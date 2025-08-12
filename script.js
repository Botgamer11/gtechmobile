// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Конфигурация приложения
const config = {
    creatorId: 6595683709, // Заменить на реальный ID создателя бота
    links: {
        game: 'https://example.com/game',
        chat: 'https://t.me/gtech_chat',
        channel: 'https://t.me/gtech_channel'
    },
    bonuses: {
        days: [5, 10, 15, 20, 25, 30, 35, 40, 50],
        resetHour: 3 // 3:00 МСК
    }
};

// Состояние приложения
const state = {
    user: {
        id: tg.initDataUnsafe?.user?.id || 0,
        name: tg.initDataUnsafe?.user?.first_name || 'Гость',
        lastName: tg.initDataUnsafe?.user?.last_name || '',
        username: tg.initDataUnsafe?.user?.username ? `@${tg.initDataUnsafe.user.username}` : '',
        photoUrl: tg.initDataUnsafe?.user?.photo_url || '',
        balance: 0,
        tickets: 0,
        registered: new Date().toISOString().split('T')[0],
        likes: 0,
        comments: 0,
        vkLinked: false,
        lastBonusDate: null,
        claimedBonuses: []
    },
    currentPage: 'main',
    promoCode: '',
    activeShopTab: 'auction',
    isAdmin: tg.initDataUnsafe?.user?.id === config.creatorId
};

// Загрузка состояния из localStorage
function loadState() {
    const savedState = localStorage.getItem('gtech_state');
    if (savedState) {
        const parsed = JSON.parse(savedState);
        // Проверка сброса бонусов по московскому времени
        const now = new Date();
        const mskTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (3 * 3600000));
        
        if (parsed.user.lastBonusDate) {
            const lastDate = new Date(parsed.user.lastBonusDate);
            const lastMsk = new Date(lastDate.getTime() + (lastDate.getTimezoneOffset() * 60000) + (3 * 3600000));
            
            // Если новый день в МСК, сбрасываем бонусы
            if (mskTime.getDate() !== lastMsk.getDate() || 
                mskTime.getMonth() !== lastMsk.getMonth() || 
                mskTime.getFullYear() !== lastMsk.getFullYear()) {
                parsed.user.claimedBonuses = [];
            }
        }
        
        Object.assign(state, parsed);
    }
}

// Сохранение состояния в localStorage
function saveState() {
    localStorage.setItem('gtech_state', JSON.stringify(state));
}

// Инициализация приложения
function initApp() {
    loadState();
    render();
    tg.ready();
    
    // Обработка изменения размера окна
    tg.onEvent('viewportChanged', function() {
        tg.expand();
    });
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

// Рендер страниц
const pages = {
    main: `
        <div class="page">
            <div class="header">
                <h1>Gtech Mobile</h1>
            </div>
            
            ${state.isAdmin ? `
                <div class="admin-panel">
                    <h3 class="admin-title">👑 АДМИН ПАНЕЛЬ</h3>
                    <button class="btn btn-secondary" onclick="navigateTo('admin')">
                        ОТКРЫТЬ АДМИНКУ
                    </button>
                </div>
            ` : ''}
            
            <div class="user-card">
                ${state.user.photoUrl ? `
                    <img src="${state.user.photoUrl}" class="user-avatar" alt="Аватар">
                ` : `<div class="user-avatar">👤</div>`}
                
                <div class="user-name">
                    ${state.user.name} ${state.user.lastName}
                </div>
                
                ${state.user.username ? `
                    <div class="user-username">${state.user.username}</div>
                ` : ''}
                
                <div class="balance">
                    <div class="balance-item">
                        <div class="balance-value">${state.user.balance}</div>
                        <div class="balance-label">БАЛАНС</div>
                    </div>
                    <div class="balance-item">
                        <div class="balance-value">${state.user.tickets}</div>
                        <div class="balance-label">БИЛЕТОВ</div>
                    </div>
                </div>
            </div>
            
            <button class="btn btn-primary" onclick="navigateTo('download')">
                СКАЧАТЬ ИГРУ
            </button>
            
            <button class="btn btn-secondary" onclick="navigateTo('gift')">
                ПОЛУЧИТЬ ПОДАРОК
            </button>
            
            <div class="card">
                <h3 class="card-title">ТОП АКТИВНЫХ ИГРОКОВ</h3>
                <button class="btn btn-primary" onclick="navigateTo('shop')">
                    МАГАЗИН ИГРОВЫХ ТОВАРОВ
                </button>
            </div>
            
            <div class="card">
                <h3 class="card-title">БОНУСНЫЕ МОНЕТЫ</h3>
                <div class="grid">
                    <div class="grid-item" onclick="navigateTo('storage')">
                        <div class="grid-item-icon">📦</div>
                        ХРАНИЛИЩЕ
                    </div>
                    <div class="grid-item" onclick="navigateTo('promo')">
                        <div class="grid-item-icon">🎟️</div>
                        ПРОМОКОД
                    </div>
                    <div class="grid-item" onclick="navigateTo('bonus')">
                        <div class="grid-item-icon">🎁</div>
                        БОНУСЫ
                    </div>
                    <div class="grid-item" onclick="navigateTo('settings')">
                        <div class="grid-item-icon">⚙️</div>
                        НАСТРОЙКИ
                    </div>
                </div>
            </div>
        </div>
    `,
    
    admin: `
        <div class="page">
            <a class="back-btn" onclick="navigateTo('main')">
                ← Назад
            </a>
            
            <h2 class="card-title">👑 АДМИН ПАНЕЛЬ</h2>
            
            <div class="card">
                <h3 class="card-title">Добавить промокод</h3>
                <input type="text" class="input-field" id="promo-code" placeholder="Промокод">
                <input type="number" class="input-field" id="promo-amount" placeholder="Количество монет">
                <button class="btn btn-primary" onclick="addPromoCode()">
                    СОЗДАТЬ ПРОМОКОД
                </button>
            </div>
            
            <div class="card">
                <h3 class="card-title">Изменить ссылки</h3>
                <input type="text" class="input-field" id="link-game" placeholder="Ссылка на игру" value="${config.links.game}">
                <input type="text" class="input-field" id="link-chat" placeholder="Ссылка на чат" value="${config.links.chat}">
                <input type="text" class="input-field" id="link-channel" placeholder="Ссылка на канал" value="${config.links.channel}">
                <button class="btn btn-secondary" onclick="updateLinks()">
                    ОБНОВИТЬ ССЫЛКИ
                </button>
            </div>
            
            <div class="card">
                <h3 class="card-title">Выдать монеты</h3>
                <input type="number" class="input-field" id="user-id" placeholder="ID пользователя">
                <input type="number" class="input-field" id="coins-amount" placeholder="Количество монет">
                <button class="btn btn-primary" onclick="addCoinsToUser()">
                    ВЫДАТЬ МОНЕТЫ
                </button>
            </div>
        </div>
    `,
    
    bonus: `
        <div class="page">
            <a class="back-btn" onclick="navigateTo('main')">
                ← Назад
            </a>
            
            <h2 class="card-title">БОНУСНЫЕ МОНЕТЫ</h2>
            
            <div class="card">
                <p>Заходите каждый день и забирайте бонусы.</p>
                
                <h3 class="card-title">ЕЖЕДНЕВНЫЙ БОНУС</h3>
                <p><strong>ЗА ПОДПИСКУ</strong></p>
                
                <button class="btn btn-secondary" onclick="claimBonus()">
                    ЗАБРАТЬ БОНУС
                </button>
                
                <div class="bonus-grid">
                    ${config.bonuses.days.map((amount, index) => {
                        const day = index + 1;
                        return `
                            <div class="bonus-day ${state.user.claimedBonuses.includes(day) ? 'active' : ''}">
                                ${day} ДЕНЬ
                                <div class="bonus-day-value">${amount}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `,
    
    download: `
        <div class="page">
            <a class="back-btn" onclick="navigateTo('main')">
                ← Назад
            </a>
            
            <h2 class="card-title">СКАЧАТЬ ИГРУ</h2>
            
            <div class="card">
                <p>Для скачивания игры выберите платформу:</p>
                
                <div class="grid">
                    <div class="grid-item" onclick="window.open('${config.links.game}', '_blank')">
                        <div class="grid-item-icon">⬇️</div>
                        ОФИЦИАЛЬНЫЙ САЙТ
                    </div>
                    <div class="grid-item" onclick="window.open('${config.links.chat}', '_blank')">
                        <div class="grid-item-icon">💬</div>
                        ЧАТ ПОДДЕРЖКИ
                    </div>
                </div>
            </div>
        </div>
    `,
    
    promo: `
        <div class="page">
            <a class="back-btn" onclick="navigateTo('main')">
                ← Назад
            </a>
            
            <h2 class="card-title">АКТИВИРОВАТЬ ПРОМОКОД</h2>
            
            <div class="card">
                <input type="text" class="input-field" placeholder="Введите промокод" value="${state.promoCode}" oninput="state.promoCode = this.value">
                <button class="btn btn-primary" onclick="applyPromoCode()">
                    АКТИВИРОВАТЬ
                </button>
            </div>
        </div>
    `,
    
    settings: `
        <div class="page">
            <a class="back-btn" onclick="navigateTo('main')">
                ← Назад
            </a>
            
            <h2 class="card-title">НАСТРОЙКИ</h2>
            
            <div class="card">
                <table style="width: 100%;">
                    <tr>
                        <td>Игровой ID:</td>
                        <td>${state.user.id}</td>
                    </tr>
                    <tr>
                        <td>Дата регистрации:</td>
                        <td>${state.user.registered}</td>
                    </tr>
                </table>
            </div>
            
            <div class="card">
                <h3 class="card-title">ПРИВЯЗАТЬ ВК</h3>
                <button class="btn ${state.user.vkLinked ? 'btn-secondary' : 'btn-primary'}" onclick="${state.user.vkLinked ? 'unlinkVK()' : 'linkVK()'}">
                    ${state.user.vkLinked ? 'ОТВЯЗАТЬ' : 'ПРИВЯЗАТЬ'}
                </button>
            </div>
        </div>
    `
};

// Навигация по страницам
function navigateTo(page) {
    state.currentPage = page;
    render();
    window.scrollTo(0, 0);
}

// Рендер текущей страницы
function render() {
    const app = document.getElementById('app');
    app.innerHTML = pages[state.currentPage] || pages.main;
    saveState();
}

// Функция для получения бонуса
function claimBonus() {
    const now = new Date();
    const mskTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (3 * 3600000));
    const today = mskTime.getDate();
    
    // Проверяем, получал ли пользователь бонус сегодня
    if (state.user.lastBonusDate) {
        const lastDate = new Date(state.user.lastBonusDate);
        const lastMsk = new Date(lastDate.getTime() + (lastDate.getTimezoneOffset() * 60000) + (3 * 3600000));
        
        if (mskTime.getDate() === lastMsk.getDate() && 
            mskTime.getMonth() === lastMsk.getMonth() && 
            mskTime.getFullYear() === lastMsk.getFullYear()) {
            showNotification('Вы уже получали бонус сегодня!', true);
            return;
        }
    }
    
    // Определяем следующий бонус
    const nextBonus = state.user.claimedBonuses.length > 0 
        ? Math.max(...state.user.claimedBonuses) + 1 
        : 1;
    
    if (nextBonus > config.bonuses.days.length) {
        showNotification('Вы получили все бонусы!', true);
        return;
    }
    
    // Начисляем бонус
    const bonusAmount = config.bonuses.days[nextBonus - 1];
    state.user.balance += bonusAmount;
    state.user.claimedBonuses.push(nextBonus);
    state.user.lastBonusDate = new Date().toISOString();
    
    showNotification(`Бонус за ${nextBonus} день получен! +${bonusAmount} монет`);
    render();
}

// Активация промокода
function applyPromoCode() {
    if (!state.promoCode) {
        showNotification('Введите промокод!', true);
        return;
    }
    
    // Здесь должна быть проверка промокода на сервере
    // Для демо просто добавляем 100 монет
    state.user.balance += 100;
    showNotification('Промокод активирован! +100 монет');
    state.promoCode = '';
    render();
}

// Админ-функции
function addPromoCode() {
    const code = document.getElementById('promo-code').value;
    const amount = parseInt(document.getElementById('promo-amount').value);
    
    if (!code || isNaN(amount)) {
        showNotification('Заполните все поля!', true);
        return;
    }
    
    // Здесь должна быть логика сохранения промокода
    showNotification(`Промокод ${code} на ${amount} монет создан!`);
}

function updateLinks() {
    config.links.game = document.getElementById('link-game').value;
    config.links.chat = document.getElementById('link-chat').value;
    config.links.channel = document.getElementById('link-channel').value;
    
    showNotification('Ссылки обновлены!');
}

function addCoinsToUser() {
    const userId = parseInt(document.getElementById('user-id').value);
    const amount = parseInt(document.getElementById('coins-amount').value);
    
    if (isNaN(userId) || isNaN(amount)) {
        showNotification('Заполните все поля!', true);
        return;
    }
    
    // Здесь должна быть логика выдачи монет пользователю
    showNotification(`Выдано ${amount} монет пользователю ${userId}`);
}

// Привязка ВК
function linkVK() {
    state.user.vkLinked = true;
    showNotification('Аккаунт ВК привязан!');
    render();
}

function unlinkVK() {
    state.user.vkLinked = false;
    showNotification('Аккаунт ВК отвязан!');
    render();
}

// Инициализация приложения
initApp();