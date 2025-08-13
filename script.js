// Загрузка данных пользователя
async function loadUserData() {
    const response = await fetch("/balance/user1");
    const data = await response.json();
    document.getElementById("balance").textContent = data.balance;
}

// Активация промокода
async function activatePromo() {
    const code = prompt("Введите промокод:");
    if (!code) return;

    const response = await fetch("/promo/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "user1", code })
    });

    const result = await response.json();
    alert(result.error || `Успешно! Баланс: ${result.newBalance}`);
}

// Вывод средств
async function requestWithdraw() {
    const nickname = document.getElementById("nickname").value;
    const amount = parseInt(document.getElementById("amount").value);

    const response = await fetch("/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "user1", nickname, amount })
    });

    const result = await response.json();
    alert(result.error || result.status);
}

// Ежедневный бонус
async function claimDailyBonus() {
    const response = await fetch("/bonus/user1", { method: "POST" });
    const result = await response.json();
    alert(result.error || `+${result.bonus} монет!`);
}

// Открыть ссылку
function openLink(url) {
    window.open(url, "_blank");
}

// Загрузка данных при старте
loadUserData();