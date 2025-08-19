# gtechmobile
hhii7
Setup for persistent balance and leaderboard (PostgreSQL)

1) Apply migrations:

psql "$DATABASE_URL" -f db/postgres.sql

2) Use from your bot code:

-- Award rubles atomically (upsert + log):
SELECT * FROM award_rubles($user_id, $delta, $source, $meta_json);

-- Top 100 leaderboard:
SELECT * FROM leaderboard_top100;

-- Admin daily earnings:
SELECT * FROM admin_daily_earnings;

Notes
- Ensure your DB user has privileges to create functions and views.
- Use BIGINT for balances to avoid floating point errors.