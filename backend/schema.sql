
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency VARCHAR(10) NOT NULL CHECK (currency IN ('USD', 'GOLD')),
  balance NUMERIC(18, 8) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(user_id, currency)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdraw', 'transfer_debit', 'transfer_credit')),
  amount NUMERIC(18, 8) NOT NULL CHECK (amount > 0),
  reference VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes for faster queriying
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Indexes for uniqueness check
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
