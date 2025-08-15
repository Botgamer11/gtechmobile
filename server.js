const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Конфигурация базы данных
const dbConfig = {
    host: 'localhost',
    user: 'cq13367_ndr',
    password: 'Dinasaeva33A',
    database: 'cq13367_ndr'
};

// Подключение к базе данных
let pool;
async function initDB() {
    pool = mysql.createPool(dbConfig);
    
    // Создаем таблицы, если их нет
    await pool.query(`
        CREATE TABLE IF NOT EXISTS app_settings (
            id INT PRIMARY KEY DEFAULT 1,
            settings JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id BIGINT PRIMARY KEY,
            name VARCHAR(255),
            balance INT DEFAULT 100,
            last_bonus_date VARCHAR(255),
            claimed_bonuses JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
}

// API для работы с базой данных
app.post('/db', async (req, res) => {
    try {
        const { sql, params } = req.body;
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    await initDB();
    console.log(`Server running on port ${PORT}`);
});