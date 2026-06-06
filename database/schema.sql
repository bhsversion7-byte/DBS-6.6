CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code VARCHAR(3) NOT NULL UNIQUE,
  currency_name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fx_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency VARCHAR(3) NOT NULL,
  quote_currency VARCHAR(3) NOT NULL,
  mid_rate NUMERIC(20, 8) NOT NULL,
  bid_rate NUMERIC(20, 8) NOT NULL,
  ask_rate NUMERIC(20, 8) NOT NULL,
  spread NUMERIC(20, 8) NOT NULL,
  source VARCHAR(50) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  CONSTRAINT fx_rates_pair_check CHECK (base_currency <> quote_currency)
);

CREATE INDEX IF NOT EXISTS ix_fx_rates_pair_timestamp
  ON fx_rates (base_currency, quote_currency, timestamp DESC);

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id VARCHAR(50) NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  amount NUMERIC(20, 8) NOT NULL,
  rate NUMERIC(20, 8) NOT NULL,
  target_amount NUMERIC(20, 8) NOT NULL,
  status VARCHAR(30) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT quotes_status_check CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED')),
  CONSTRAINT quotes_pair_check CHECK (from_currency <> to_currency)
);

CREATE INDEX IF NOT EXISTS ix_quotes_user_created_at ON quotes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_quotes_expires_at ON quotes (expires_at);

CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id VARCHAR(50) NOT NULL UNIQUE,
  quote_id UUID NOT NULL REFERENCES quotes(id),
  user_id UUID NOT NULL,
  pair VARCHAR(20) NOT NULL,
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  amount NUMERIC(20, 8) NOT NULL,
  target_amount NUMERIC(20, 8) NOT NULL,
  locked_rate NUMERIC(20, 8) NOT NULL,
  status VARCHAR(50) NOT NULL,
  risk_score INTEGER NOT NULL,
  idempotency_key VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  CONSTRAINT trades_status_check CHECK (
    status IN (
      'CREATED',
      'QUOTE_LOCKED',
      'PENDING_RISK_CHECK',
      'CONFIRMED',
      'SETTLEMENT_PENDING',
      'SETTLED',
      'FAILED',
      'REJECTED',
      'CANCELLED',
      'EXPIRED'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_trades_idempotency_key
  ON trades (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_trades_user_created_at ON trades (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_trades_status_created_at ON trades (status, created_at DESC);

CREATE TABLE IF NOT EXISTS trade_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id),
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_trade_status_logs_trade_created_at
  ON trade_status_logs (trade_id, created_at ASC);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trade_id UUID REFERENCES trades(id),
  message TEXT NOT NULL,
  channel VARCHAR(50) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_notifications_user_created_at
  ON notifications (user_id, created_at DESC);
