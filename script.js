// script.js
const tg = window.Telegram.WebApp;
tg.expand();

// Инициализация бота
const bot = {
    sendData: (data) => {
        tg.sendData(JSON.stringify(data));
    },
    showAlert: (message) => {
        tg.showAlert(message);
    }
};

// Данные приложения
const backend = {
    creatorId: 6595683709, // Ваш Telegram ID
    adminIds: [123456789], // Массив ID админов
    supportLink: "https://t.me/gtech_support_bot",
    promoCodes: [],
    buttons: {
        dailyBonus: "ЕЖЕДНЕВНЫЙ БОНУС",
        getGift: "ПОЛУЧИТЬ ПОДАРОК",
        community: "СООБЩЕСТВО",
        download: "СКАЧАТЬ ИГРУ",
        adminPanel: "АДМИН ПАНЕЛЬ",
        back: "НАЗАД",
        support: "ТЕХ ПОДДЕРЖКА",
        withdraw: "ВЫВОД СРЕДСТВ",
        history: "ИСТОРИЯ ВЫВОДОВ"
    },
    bonuses: [5, 10, 15, 15, 15, 15, 15, 15, 15],
    users: {},
    withdrawalRequests: []
};

// Состояние приложения
const state = {
    user: {
        id: tg.initDataUnsafe?.user?.id || 0,
        name: tg.initDataUnsafe?.user?.first_name || 'Гость',
        username: tg.initDataUnsafe?.user?.username || '',
        balance: 0, // Начальный баланс для демонстрации
        lastBonusDate: null,
        claimedBonuses: [],
        withdrawalHistory: []
    },
    currentPage: 'main',
    isAdmin: backend.adminIds.includes(tg.initDataUnsafe?.user?.id),
    isCreator: tg.initDataUnsafe?.user?.id === backend.creatorId
};

// Загрузка данных
function loadData() {
    const savedData = localStorage.getItem('gtech_backend');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            Object.assign(backend, parsedData);
            
            // Проверяем, есть ли creatorId в adminIds
            if (!backend.adminIds.includes(backend.creatorId)) {
                backend.adminIds.push(backend.creatorId);
            }
        } catch (e) {
            console.error("Ошибка загрузки данных:", e);
        }
    }
    
    if (!backend.users[state.user.id]) {
        backend.users[state.user.id] = {
            balance: 0,
            lastBonusDate: null,
            claimedBonuses: [],
            usedPromoCodes: [],
            withdrawalHistory: []
        };
    }
    
    Object.assign(state.user, backend.users[state.user.id]);
    state.isAdmin = backend.adminIds.includes(state.user.id);
    state.isCreator = state.user.id === backend.creatorId;
}

// Сохранение данных
function saveData() {
    backend.users[state.user.id] = {
        balance: state.user.balance,
        lastBonusDate: state.user.lastBonusDate,
        claimedBonuses: state.user.claimedBonuses,
        usedPromoCodes: state.user.usedPromoCodes || [],
        withdrawalHistory: state.user.withdrawalHistory || []
    };
    
    localStorage.setItem('gtech_backend', JSON.stringify(backend));
}

// Уведомления
function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : ''}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Навигация
function navigateTo(page) {
    state.currentPage = page;
    render();
    window.scrollTo(0, 0);
}

// Получение бонуса
function claimBonus() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    if (state.user.lastBonusDate) {
        const lastDate = new Date(state.user.lastBonusDate);
        const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()).getTime();
        
        if (today === lastDay) {
            showNotification('Вы уже получали бонус сегодня!', true);
            return;
        }
    }
    
    const nextBonusDay = state.user.claimedBonuses.length + 1;
    if (nextBonusDay > backend.bonuses.length) {
        showNotification('Вы получили все бонусы!', true);
        return;
    }
    
    const bonusAmount = backend.bonuses[nextBonusDay - 1];
    state.user.balance += bonusAmount;
    state.user.claimedBonuses.push(nextBonusDay);
    state.user.lastBonusDate = new Date().toISOString();
    
    showNotification(`Бонус за ${nextBonusDay} день: +${bonusAmount} монет!`);
    saveData();
    render();
}

// Модальные окна
function openModal(content) {
    const modal = document.getElementById('modal');
    modal.innerHTML = content;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Вывод средств
function openWithdrawModal() {
    const modalContent = `
        <div class="modal-content">
            <button class="modal-close" onclick="closeModal()">×</button>
            <h3 class="modal-title">ЗАЯВКА НА ВЫВОД</h3>
            <input type="text" class="input-field" id="withdraw-nickname" 
                   placeholder="Ваш игровой никнейм" value="${state.user.username || ''}">
            <input type="number" class="input-field" id="withdraw-amount" 
                   placeholder="Сумма (до ${state.user.balance})" max="${state.user.balance}">
            <button class="btn btn-success" onclick="submitWithdraw()">ПОДТВЕРДИТЬ ВЫВОД</button>
        </div>
    `;
    openModal(modalContent);
}

function submitWithdraw() {
    const nickname = document.getElementById('withdraw-nickname').value.trim();
    const amount = parseInt(document.getElementById('withdraw-amount').value);
    
    if (!nickname || nickname.length < 3) {
        showNotification('Никнейм должен содержать минимум 3 символа!', true);
        return;
    }
    
    if (isNaN(amount) || amount <= 0) {
        showNotification('Введите корректную сумму!', true);
        return;
    }
    
    if (amount > state.user.balance) {
        showNotification('Недостаточно средств на балансе!', true);
        return;
    }
    
    // Создаем заявку
    const withdrawalRequest = {
        id: Date.now(),
        userId: state.user.id,
        username: state.user.username,
        nickname,
        amount,
        date: new Date().toISOString(),
        status: 'pending'
    };
    
    // Добавляем в историю
    state.user.withdrawalHistory.unshift(withdrawalRequest);
    backend.withdrawalRequests.unshift(withdrawalRequest);
    
    // Списываем средства
    state.user.balance -= amount;
    
    // Отправляем данные боту
    bot.sendData({
        type: 'withdrawal',
        data: withdrawalRequest
    });
    
    showNotification(`Заявка на вывод ${amount} монет отправлена!`);
    saveData();
    closeModal();
    render();
}

// История выводов
function openWithdrawHistory() {
    const historyItems = state.user.withdrawalHistory.map(item => `
        <div class="withdraw-item">
            <div><strong>${item.nickname}</strong> • ${new Date(item.date).toLocaleDateString()}</div>
            <div>Сумма: <span class="withdraw-amount">${item.amount} монет</span>
                <span class="withdraw-status status-${item.status}">
                    ${item.status === 'pending' ? 'В обработке' : 
                      item.status === 'completed' ? 'Выполнено' : 'Отклонено'}
                </span>
            </div>
        </div>
    `).join('') || '<p style="text-align:center;color:var(--text-gray)">История выводов пуста</p>';
    
    const modalContent = `
        <div class="modal-content">
            <button class="modal-close" onclick="closeModal()">×</button>
            <h3 class="modal-title">ИСТОРИЯ ВЫВОДОВ</h3>
            <div class="withdraw-history">
                ${historyItems}
            </div>
        </div>
    `;
    openModal(modalContent);
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

function updateSupportLink() {
    backend.supportLink = document.getElementById('support-link').value;
    saveData();
    showNotification('Ссылка на поддержку обновлена!');
}

function addAdmin() {
    const adminId = parseInt(document.getElementById('new-admin-id').value);
    if (isNaN(adminId)) {
        showNotification('Введите корректный ID!', true);
        return;
    }
    
    if (backend.adminIds.includes(adminId)) {
        showNotification('Этот пользователь уже админ!', true);
        return;
    }
    
    backend.adminIds.push(adminId);
    saveData();
    showNotification('Админ добавлен!');
    document.getElementById('new-admin-id').value = '';
    renderAdminPanel();
}

function removeAdmin(adminId) {
    if (adminId === backend.creatorId) {
        showNotification('Нельзя удалить создателя!', true);
        return;
    }
    
    backend.adminIds = backend.adminIds.filter(id => id !== adminId);
    saveData();
    showNotification('Админ удален!');
    renderAdminPanel();
}

function renderAdminPanel() {
    if (state.currentPage === 'admin') {
        const app = document.getElementById('app');
        app.innerHTML = pages.admin;
    }
}

// Страницы приложения
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
            
            <button class="btn" onclick="navigateTo('promo')">
                АКТИВИРОВАТЬ ПРОМОКОД
            </button>
            
            <button class="btn" onclick="openWithdrawModal()">
                ${backend.buttons.withdraw}
            </button>
            
            <button class="btn" onclick="openWithdrawHistory()">
                ${backend.buttons.history}
            </button>
            
            <button class="btn" onclick="window.open('${backend.supportLink}', '_blank')">
                ${backend.buttons.support}
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
            <button class="btn back-btn" onclick="navigateTo('main')">
                ${backend.buttons.back}
            </button>
            
            <div class="card">
                <h3 class="card-title">Управление админами</h3>
                <input type="number" class="input-field" id="new-admin-id" placeholder="Telegram ID нового админа">
                <button class="btn" onclick="addAdmin()">
                    ДОБАВИТЬ АДМИНА
                </button>
                
                <div class="admin-list">
                    <h4>Текущие админы:</h4>
                    ${backend.adminIds.map(id => `
                        <div class="admin-item">
                            <div class="admin-info">
                                <div class="admin-avatar">${id.toString().charAt(0)}</div>
                                <span>ID: ${id}</span>
                            </div>
                            ${id !== backend.creatorId ? `
                                <button class="btn btn-danger" onclick="removeAdmin(${id})">Удалить</button>
                            ` : '<span style="color: var(--secondary); font-weight: 600">Создатель</span>'}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="card">
                <h3 class="card-title">Настройки поддержки</h3>
                <input type="text" class="input-field" id="support-link" 
                       placeholder="Ссылка на поддержку" value="${backend.supportLink}">
                <button class="btn" onclick="updateSupportLink()">
                    ОБНОВИТЬ ССЫЛКУ
                </button>
            </div>
            
            <div class="card">
                <h3 class="card-title">Текст кнопок</h3>
                <input type="text" class="input-field" id="btn-daily-bonus" 
                       placeholder="Ежедневный бонус" value="${backend.buttons.dailyBonus}">
                <input type="text" class="input-field" id="btn-get-gift" 
                       placeholder="Получить подарок" value="${backend.buttons.getGift}">
                <input type="text" class="input-field" id="btn-community" 
                       placeholder="Сообщество" value="${backend.buttons.community}">
                <input type="text" class="input-field" id="btn-download" 
                       placeholder="Скачать игру" value="${backend.buttons.download}">
                <button class="btn" onclick="updateButtonTexts()">
                    ОБНОВИТЬ ТЕКСТ КНОПОК
                </button>
            </div>
            
            <div class="card">
                <h3 class="card-title">Все заявки на вывод</h3>
                <div class="withdraw-history">
                    ${backend.withdrawalRequests.slice(0, 5).map(item => `
                        <div class="withdraw-item">
                            <div><strong>${item.nickname}</strong> (ID: ${item.userId}) • ${new Date(item.date).toLocaleDateString()}</div>
                            <div>Сумма: <span class="withdraw-amount">${item.amount} монет</span>
                                <span class="withdraw-status status-${item.status}">
                                    ${item.status === 'pending' ? 'В обработке' : 
                                      item.status === 'completed' ? 'Выполнено' : 'Отклонено'}
                                </span>
                            </div>
                        </div>
                    `).join('') || '<p style="text-align:center;color:var(--text-gray)">Нет заявок</p>'}
                </div>
            </div>
        </div>
    `,
    
    bonus: `
        <div class="page">
            <button class="btn back-btn" onclick="navigateTo('main')">
                ${backend.buttons.back}
            </button>
            
            <div class="card">
                <h2 class="card-title">${backend.buttons.dailyBonus}</h2>
                <button class="btn" onclick="claimBonus()">
                    ${backend.buttons.getGift}
                </button>
            </div>
        </div>
    `,
    
    promo: `
        <div class="page">
            <button class="btn back-btn" onclick="navigateTo('main')">
                ${backend.buttons.back}
            </button>
            
            <div class="card">
                <h2 class="card-title">АКТИВАЦИЯ ПРОМОКОДА</h2>
                <input type="text" class="input-field" id="promo-input" placeholder="Введите промокод">
                <button class="btn" onclick="usePromoCode()">
                    АКТИВИРОВАТЬ
                </button>
            </div>
        </div>
    `
};

// Рендер приложения
function render() {
    const app = document.getElementById('app');
    app.innerHTML = pages[state.currentPage] || pages.main;
    saveData();
}

// Инициализация
function initApp() {
    loadData();
    render();
    tg.ready();
    
    // Обработка данных от бота
    tg.onEvent('webAppDataReceived', (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'withdrawal_update') {
                // Обновляем статус вывода
                const request = backend.withdrawalRequests.find(r => r.id === data.id);
                if (request) {
                    request.status = data.status;
                    
                    // Обновляем у пользователя
                    const userRequest = state.user.withdrawalHistory.find(r => r.id === data.id);
                    if (userRequest) {
                        userRequest.status = data.status;
                    }
                    
                    if (data.status === 'rejected') {
                        // Возвращаем средства при отказе
                        state.user.balance += request.amount;
                    }
                    
                    saveData();
                    render();
                    showNotification(`Статус вывода #${data.id} обновлен: ${data.status}`);
                }
            }
        } catch (e) {
            console.error("Ошибка обработки данных:", e);
        }
    });
}

initApp();