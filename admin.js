// Загрузка данных
async function loadAdminData() {
    const response = await fetch('/api/admin/data');
    return await response.json();
}

// Управление промокодами
document.getElementById('create-promo').addEventListener('click', async () => {
    const code = document.getElementById('promo-code').value;
    const amount = document.getElementById('promo-amount').value;
    const uses = document.getElementById('promo-uses').value;
    
    const response = await fetch('/api/admin/promo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, amount, uses })
    });
    
    if (response.ok) {
        alert('Промокод создан!');
        updatePromoList();
    }
});

// Обновление списка промокодов
async function updatePromoList() {
    const data = await loadAdminData();
    const list = document.getElementById('promo-list');
    list.innerHTML = data.promoCodes.map(promo => `
        <div class="promo-item">
            <span>${promo.code} - ${promo.amount} монет</span>
            <span>Осталось: ${promo.uses}</span>
        </div>
    `).join('');
}

// Инициализация админ-панели
document.addEventListener('DOMContentLoaded', async () => {
    await updatePromoList();
    await updateAdminsList();
    
    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});