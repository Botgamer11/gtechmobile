const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.json());

// Загрузка базы данных
function loadDB() {
    return JSON.parse(fs.readFileSync("database.json"));
}

// Сохранение базы данных
function saveDB(data) {
    fs.writeFileSync("database.json", JSON.stringify(data, null, 2));
}

// API: Получить баланс
app.get("/balance/:userId", (req, res) => {
    const db = loadDB();
    const user = db.users.find(u => u.id === req.params.userId);
    res.json({ balance: user?.balance || 0 });
});

// API: Активировать промокод
app.post("/promo/activate", (req, res) => {
    const { userId, code } = req.body;
    const db = loadDB();
    const promo = db.promoCodes.find(p => p.code === code && p.isActive);

    if (!promo) return res.status(400).json({ error: "Неверный промокод" });

    const user = db.users.find(u => u.id === userId);
    user.balance += promo.coins;
    promo.isActive = false;

    saveDB(db);
    res.json({ newBalance: user.balance });
});

// API: Вывод средств
app.post("/withdraw", (req, res) => {
    const { userId, nickname, amount } = req.body;
    const db = loadDB();
    const user = db.users.find(u => u.id === userId);

    if (amount < db.settings.minWithdraw) {
        return res.status(400).json({ error: `Минимум: ${db.settings.minWithdraw} монет` });
    }

    if (user.balance < amount) {
        return res.status(400).json({ error: "Недостаточно средств" });
    }

    db.withdrawRequests.push({ userId, nickname, amount, date: new Date().toISOString() });
    user.balance -= amount;

    saveDB(db);
    res.json({ status: "Заявка принята" });
});

// API: Ежедневный бонус
app.post("/bonus/:userId", (req, res) => {
    const db = loadDB();
    const user = db.users.find(u => u.id === req.params.userId);
    const today = new Date().toISOString().split("T")[0];

    if (user.lastBonusClaim === today) {
        return res.status(400).json({ error: "Бонус уже получен сегодня" });
    }

    user.balance += db.settings.dailyBonus;
    user.lastBonusClaim = today;

    saveDB(db);
    res.json({ bonus: db.settings.dailyBonus });
});

app.listen(3000, () => console.log("Сервер запущен на http://localhost:3000"));