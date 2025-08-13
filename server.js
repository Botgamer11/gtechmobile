const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.json());

// Загрузка базы данных
function loadDB() {
    return JSON.parse(fs.readFileSync('database.json'));
}

// Сохранение базы данных
function saveDB(data) {
    fs.writeFileSync('database.json', JSON.stringify(data, null, 2));
}

// API для пользователя
app.post('/api/user', (req, res) => {
    const db = loadDB();
    const userId = req.body.user?.id;
    let user = db.users.find(u => u.id === userId);
    
    if (!user) {
        user = {
            id: userId,
            name: req.body.user?.first_name || 'Гость',
            balance: 0,
            tickets: 0,
            lastBonusClaim: null
        };
        db.users.push(user);
        saveDB(db);
    }
    
    res.json(user);
});

// API для админ-панели
app.get('/api/admin/data', (req, res) => {
    res.json(loadDB());
});

app.post('/api/admin/promo', (req, res) => {
    const db = loadDB();
    db.promoCodes.push({
        code: req.body.code,
        amount: req.body.amount,
        uses: req.body.uses,
        created: new Date().toISOString()
    });
    saveDB(db);
    res.json({ status: 'success' });
});

app.listen(3000, () => console.log('Server running on port 3000'));