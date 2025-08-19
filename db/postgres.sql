BEGIN;

-- Core tables
CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    is_visible_in_top BOOLEAN NOT NULL DEFAULT TRUE,
    balance BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    amount BIGINT NOT NULL CHECK (amount <> 0),
    source TEXT NOT NULL,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_created_at
    ON transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_balance_desc
    ON users(balance DESC);

CREATE INDEX IF NOT EXISTS idx_users_visibility
    ON users(is_banned, is_visible_in_top);

-- Keep updated_at in sync for manual updates
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Atomic award function (upsert + transaction log + balance update)
CREATE OR REPLACE FUNCTION award_rubles(
    p_user_id BIGINT,
    p_delta BIGINT,
    p_source TEXT,
    p_meta JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE (
    user_id BIGINT,
    balance BIGINT,
    awarded BIGINT
) AS $$
DECLARE
    new_balance BIGINT;
BEGIN
    -- Ensure user exists (idempotent)
    INSERT INTO users (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Log transaction
    INSERT INTO transactions (user_id, amount, source, meta)
    VALUES (p_user_id, p_delta, p_source, COALESCE(p_meta, '{}'::jsonb));

    -- Update balance
    UPDATE users
    SET balance = users.balance + p_delta,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO new_balance;

    RETURN QUERY SELECT p_user_id, new_balance, p_delta;
END;
$$ LANGUAGE plpgsql;

-- Leaderboard for fast reads in bot and admin panel
CREATE OR REPLACE VIEW leaderboard_top100 AS
SELECT user_id, username, balance, updated_at
FROM users
WHERE is_banned = FALSE
  AND is_visible_in_top = TRUE
ORDER BY balance DESC, updated_at DESC
LIMIT 100;

-- Admin daily aggregation (optional helper view)
CREATE OR REPLACE VIEW admin_daily_earnings AS
SELECT date_trunc('day', created_at) AS day,
       SUM(amount)                       AS total_amount,
       COUNT(*)                          AS operations
FROM transactions
GROUP BY 1
ORDER BY 1 DESC;

COMMIT;

-- Usage examples (run from app code):
-- SELECT * FROM award_rubles(123456789, 100, 'welcome_bonus', '{"promo": "A"}');
-- SELECT * FROM leaderboard_top100;
-- SELECT * FROM admin_daily_earnings;

-- Maintenance helpers (run manually if you need to repair historical data)
-- 1) Backfill missing users from transactions
DO $$
BEGIN
    INSERT INTO users (user_id)
    SELECT DISTINCT t.user_id
    FROM transactions t
    LEFT JOIN users u ON u.user_id = t.user_id
    WHERE u.user_id IS NULL;
END $$;

-- 2) Rebuild all balances from transaction log
CREATE OR REPLACE FUNCTION rebuild_all_balances()
RETURNS VOID AS $$
BEGIN
    UPDATE users u
    SET balance = COALESCE(t.sum_amount, 0),
        updated_at = NOW()
    FROM (
        SELECT user_id, SUM(amount) AS sum_amount
        FROM transactions
        GROUP BY user_id
    ) t
    WHERE u.user_id = t.user_id;
END;
$$ LANGUAGE plpgsql;

-- 3) Rebuild single user balance
CREATE OR REPLACE FUNCTION rebuild_user_balance(p_user_id BIGINT)
RETURNS BIGINT AS $$
DECLARE
    new_balance BIGINT;
BEGIN
    UPDATE users u
    SET balance = COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = p_user_id), 0),
        updated_at = NOW()
    WHERE u.user_id = p_user_id
    RETURNING balance INTO new_balance;

    RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

