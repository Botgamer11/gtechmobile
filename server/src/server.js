import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: process.env.ENV_PATH || '/workspace/.env' });

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3001;

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'cq13367_ngn',
  password: process.env.DB_PASSWORD || 'Dinasaeva33A',
  database: process.env.DB_NAME || 'cq13367_ngn',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

/**
 * Create a pooled MySQL connection.
 */
let pool;
async function getPool() {
  if (!pool) {
    pool = mysql.createPool(DB_CONFIG);
  }
  return pool;
}

async function migrate() {
  const pool = await getPool();
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    balance INT NOT NULL DEFAULT 0,
    tickets INT NOT NULL DEFAULT 0,
    join_date DATETIME NOT NULL,
    last_active DATETIME NULL,
    bonus_days INT NOT NULL DEFAULT 0,
    last_bonus_at DATETIME NULL,
    used_promos JSON NULL,
    inventory JSON NULL,
    is_admin TINYINT(1) NOT NULL DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS activities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    action VARCHAR(255) NOT NULL,
    timestamp DATETIME NOT NULL,
    INDEX idx_user_time (user_id, timestamp),
    CONSTRAINT fk_activities_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS promos (
    code VARCHAR(64) PRIMARY KEY,
    reward INT NOT NULL,
    uses INT NOT NULL DEFAULT 0,
    max_uses INT NOT NULL,
    created_at DATETIME NOT NULL,
    created_by BIGINT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS withdrawals (
    id VARCHAR(64) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    nickname VARCHAR(255) NOT NULL,
    tickets INT NOT NULL,
    status ENUM('pending','approved','declined') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL,
    promo_code VARCHAR(64) NULL,
    notified TINYINT(1) NOT NULL DEFAULT 0,
    INDEX idx_withdrawals_status (status),
    CONSTRAINT fk_withdrawals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
}

function toMysqlDate(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Health
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Upsert user
app.post('/api/users/sync', async (req, res) => {
  try {
    const {
      id,
      name,
      balance = 0,
      tickets = 0,
      joinDate,
      lastActive,
      bonusDays = 0,
      lastBonusDate,
      usedPromos = [],
      inventory = [],
      isAdmin = false
    } = req.body || {};

    if (!id || !name) {
      return res.status(400).json({ error: 'id and name are required' });
    }

    const pool = await getPool();

    await pool.query(
      `INSERT INTO users (id, name, balance, tickets, join_date, last_active, bonus_days, last_bonus_at, used_promos, inventory, is_admin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), balance = VALUES(balance), tickets = VALUES(tickets), last_active = VALUES(last_active), bonus_days = VALUES(bonus_days), last_bonus_at = VALUES(last_bonus_at), used_promos = VALUES(used_promos), inventory = VALUES(inventory), is_admin = VALUES(is_admin)`,
      [
        id,
        name,
        balance,
        tickets,
        toMysqlDate(joinDate) || toMysqlDate(new Date().toISOString()),
        toMysqlDate(lastActive),
        bonusDays,
        toMysqlDate(lastBonusDate),
        JSON.stringify(usedPromos),
        JSON.stringify(inventory),
        isAdmin ? 1 : 0
      ]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('sync user error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Log activity
app.post('/api/activities', async (req, res) => {
  try {
    const { userId, action, timestamp } = req.body || {};
    if (!userId || !action) return res.status(400).json({ error: 'userId and action are required' });
    const pool = await getPool();
    await pool.query('INSERT INTO activities (user_id, action, timestamp) VALUES (?, ?, ?)', [
      userId,
      action,
      toMysqlDate(timestamp) || toMysqlDate(new Date().toISOString())
    ]);
    await pool.query('UPDATE users SET last_active = ? WHERE id = ?', [toMysqlDate(new Date().toISOString()), userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('log activity error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Leaderboard (by balance desc, top 50)
app.get('/api/leaderboard', async (_req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT id, name, balance, last_active FROM users ORDER BY balance DESC, (last_active IS NULL) ASC, last_active DESC LIMIT 50'
    );
    res.json({ players: rows });
  } catch (err) {
    console.error('leaderboard error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Promos CRUD (minimal)
app.post('/api/promos', async (req, res) => {
  try {
    const { code, reward, maxUses, createdBy } = req.body || {};
    if (!code || !reward || !maxUses) return res.status(400).json({ error: 'code, reward, maxUses required' });
    const pool = await getPool();
    await pool.query('INSERT INTO promos (code, reward, max_uses, created_at, created_by) VALUES (?, ?, ?, ?, ?)', [
      code,
      reward,
      maxUses,
      toMysqlDate(new Date().toISOString()),
      createdBy || null
    ]);
    res.json({ ok: true });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'exists' });
    console.error('create promo error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/api/promos', async (_req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT code, reward, uses, max_uses AS maxUses, created_at AS createdAt, created_by AS createdBy FROM promos ORDER BY created_at DESC');
    res.json({ promos: rows });
  } catch (err) {
    console.error('list promos error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.delete('/api/promos/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const pool = await getPool();
    await pool.query('DELETE FROM promos WHERE code = ?', [code]);
    res.json({ ok: true });
  } catch (err) {
    console.error('delete promo error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/api/promos/activate', async (req, res) => {
  const conn = await (await getPool()).getConnection();
  try {
    const { userId, code } = req.body || {};
    if (!userId || !code) return res.status(400).json({ error: 'userId and code required' });
    await conn.beginTransaction();
    const [[promo]] = await conn.query('SELECT code, reward, uses, max_uses FROM promos WHERE code = ? FOR UPDATE', [code]);
    if (!promo) {
      await conn.rollback();
      return res.status(404).json({ error: 'not_found' });
    }
    if (promo.uses >= promo.max_uses) {
      await conn.rollback();
      return res.status(409).json({ error: 'exhausted' });
    }
    await conn.query('UPDATE promos SET uses = uses + 1 WHERE code = ?', [code]);
    // Update user balance and mark used promo
    const [[user]] = await conn.query('SELECT used_promos FROM users WHERE id = ? FOR UPDATE', [userId]);
    let usedPromos = [];
    try {
      usedPromos = Array.isArray(user?.used_promos) ? user.used_promos : JSON.parse(user?.used_promos || '[]');
      if (!Array.isArray(usedPromos)) usedPromos = [];
    } catch {
      usedPromos = [];
    }
    if (!usedPromos.includes(code)) usedPromos.push(code);
    await conn.query('UPDATE users SET balance = balance + ?, used_promos = ? WHERE id = ?', [
      promo.reward,
      JSON.stringify(usedPromos),
      userId
    ]);
    await conn.commit();
    res.json({ ok: true, reward: promo.reward });
  } catch (err) {
    await conn.rollback();
    console.error('activate promo error', err);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    conn.release();
  }
});

// List withdrawals
app.get('/api/withdrawals', async (_req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM withdrawals ORDER BY created_at DESC LIMIT 500');
    res.json({ withdrawals: rows });
  } catch (err) {
    console.error('list withdrawals error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Withdrawals
app.post('/api/withdrawals', async (req, res) => {
  try {
    const { id, userId, userName, nickname, tickets, status = 'pending', createdAt, promoCode = null, notified = false } = req.body || {};
    if (!id || !userId || !userName || !nickname || !tickets) return res.status(400).json({ error: 'missing_fields' });
    const pool = await getPool();
    await pool.query('INSERT INTO withdrawals (id, user_id, user_name, nickname, tickets, status, created_at, promo_code, notified) VALUES (?,?,?,?,?,?,?,?,?)', [
      id,
      userId,
      userName,
      nickname,
      tickets,
      status,
      toMysqlDate(createdAt) || toMysqlDate(new Date().toISOString()),
      promoCode,
      notified ? 1 : 0
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error('create withdrawal error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.patch('/api/withdrawals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, promoCode, notified } = req.body || {};
    const pool = await getPool();
    const fields = [];
    const params = [];
    if (status) { fields.push('status = ?'); params.push(status); }
    if (typeof promoCode !== 'undefined') { fields.push('promo_code = ?'); params.push(promoCode); }
    if (typeof notified !== 'undefined') { fields.push('notified = ?'); params.push(notified ? 1 : 0); }
    if (!fields.length) return res.status(400).json({ error: 'no_changes' });
    params.push(id);
    await pool.query(`UPDATE withdrawals SET ${fields.join(', ')} WHERE id = ?`, params);
    res.json({ ok: true });
  } catch (err) {
    console.error('update withdrawal error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Approve withdrawal with transactional ticket deduction
app.post('/api/withdrawals/:id/approve', async (req, res) => {
  const conn = await (await getPool()).getConnection();
  try {
    const { id } = req.params;
    const { promoCode } = req.body || {};
    await conn.beginTransaction();
    const [[wd]] = await conn.query('SELECT * FROM withdrawals WHERE id = ? FOR UPDATE', [id]);
    if (!wd) {
      await conn.rollback();
      return res.status(404).json({ error: 'not_found' });
    }
    if (wd.status !== 'pending') {
      await conn.rollback();
      return res.status(409).json({ error: 'invalid_status' });
    }
    const [[user]] = await conn.query('SELECT id, tickets FROM users WHERE id = ? FOR UPDATE', [wd.user_id]);
    if (!user) {
      await conn.rollback();
      return res.status(404).json({ error: 'user_not_found' });
    }
    if (user.tickets < wd.tickets) {
      await conn.rollback();
      return res.status(409).json({ error: 'insufficient_tickets' });
    }
    await conn.query('UPDATE users SET tickets = tickets - ? WHERE id = ?', [wd.tickets, wd.user_id]);
    await conn.query('UPDATE withdrawals SET status = \'approved\', promo_code = ?, notified = 0 WHERE id = ?', [promoCode || null, id]);
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error('approve withdrawal error', err);
    res.status(500).json({ error: 'internal_error' });
  } finally {
    conn.release();
  }
});

// Decline withdrawal
app.post('/api/withdrawals/:id/decline', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    await pool.query('UPDATE withdrawals SET status = \'declined\' WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('decline withdrawal error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Init and start
(async () => {
  try {
    await migrate();
    app.listen(PORT, () => {
      console.log(`[server] listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('startup error', err);
    process.exit(1);
  }
})();

