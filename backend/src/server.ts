import express, { Express, Request, Response } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();

const app: Express = express();

// Enable CORS to allow frontend (running on different port) to make requests
app.use(cors());
app.use(express.json());

// Database connection using PostgreSQL
// Using a connection pool for better performance and to handle multiple requests efficiently
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // For Railway's network
  }
});

// Types
interface User {
  id: string;
  email: string;
  createdAt: Date;
}

interface Wallet {
  id: string;
  userId: string;
  currency: 'USD' | 'GOLD';
  balance: string; // Using string to have decimal precision
  createdAt: Date;
}

interface Transaction {
  id: string;
  walletId: string;
  type: 'deposit' | 'withdraw' | 'transfer_debit' | 'transfer_credit';
  amount: string;
  reference: string;
  createdAt: Date;
}

// Custom error class to attach HTTP status codes to errors to handle all errors in one place instead of repeating res.status().json() everywhere.
class WalletError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

// Validation helpers

const isValidUUID = (uuid: string): boolean => uuidValidate(uuid);

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidAmount = (amount: number): boolean => {
  return !isNaN(amount) && amount > 0 && Number.isFinite(amount);
};

const isValidCurrency = (currency: string): boolean => {
  return ['USD', 'GOLD'].includes(currency);
};


// ENDPOINTS

// 1. Create User
app.post('/users', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Check required fields and format
    if (!email) {
      throw new WalletError(400, 'Email is required');
    }

    if (!isValidEmail(email)) {
      throw new WalletError(400, 'Invalid email format');
    }

    // Check for duplicate email before creating user
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new WalletError(409, 'Email already exists');
    }

    // Generate unique ID to create user
    const userId = uuidv4();
    const now = new Date();

    const result = await pool.query(
      'INSERT INTO users (id, email, created_at) VALUES ($1, $2, $3) RETURNING *',
      [userId, email.toLowerCase(), now]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    if (error instanceof WalletError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// 2. Create Wallet
app.post('/wallets', async (req: Request, res: Response) => {
  try {
    const { userId, currency } = req.body;

    // Validate all inputs
    if (!userId) {
      throw new WalletError(400, 'User ID is required');
    }

    if (!isValidUUID(userId)) {
      throw new WalletError(400, 'Invalid user ID format');
    }

    if (!currency) {
      throw new WalletError(400, 'Currency is required');
    }

    if (!isValidCurrency(currency)) {
      throw new WalletError(400, 'Currency must be USD or GOLD');
    }

    // Check if user exists before creating wallet
    const userExists = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userExists.rows.length === 0) {
      throw new WalletError(404, 'User not found');
    }

    // Prevent duplicate wallets for the same currency and user
    const existingWallet = await pool.query(
      'SELECT id FROM wallets WHERE user_id = $1 AND currency = $2',
      [userId, currency]
    );

    if (existingWallet.rows.length > 0) {
      throw new WalletError(409, `User already has a ${currency} wallet`);
    }

    const walletId = uuidv4();
    const now = new Date();

    // Create wallet with 0 balance
    const result = await pool.query(
      'INSERT INTO wallets (id, user_id, currency, balance, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [walletId, userId, currency, '0', now]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    if (error instanceof WalletError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error creating wallet:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// 3. Deposit Funds
app.post('/wallets/:id/deposit', async (req: Request, res: Response) => {
  // Using a database client for transactions to ensure that either all changes happen or none
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { amount } = req.body;

    // Validation
    if (!isValidUUID(id)) {
      throw new WalletError(400, 'Invalid wallet ID format');
    }

    if (amount === undefined || amount === null) {
      throw new WalletError(400, 'Amount is required');
    }

    const amountNum = parseFloat(amount);
    if (!isValidAmount(amountNum)) {
      throw new WalletError(400, 'Amount must be a positive number');
    }

    // Begin database transaction
    await client.query('BEGIN');

    // FOR UPDATE to ensure two deposits don't happen simultaneously and cause incorrect balances
    const walletResult = await client.query(
      'SELECT * FROM wallets WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (walletResult.rows.length === 0) {
      throw new WalletError(404, 'Wallet not found');
    }

    const wallet = walletResult.rows[0];
    // Using 8 decimal places for good precision 
    const newBalance = (parseFloat(wallet.balance) + amountNum).toFixed(8);

    // Update wallet balance
    await client.query(
      'UPDATE wallets SET balance = $1 WHERE id = $2',
      [newBalance, id]
    );

    // Create transaction record for audit trail
    const transactionId = uuidv4();
    const now = new Date();
    const reference = `DEPOSIT-${transactionId.substring(0, 8)}`;

    const transaction = await client.query(
      'INSERT INTO transactions (id, wallet_id, type, amount, reference, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [transactionId, id, 'deposit', amountNum.toString(), reference, now]
    );

    // Commit transaction to save all changes to the database
    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      data: {
        wallet: { ...wallet, balance: newBalance },
        transaction: transaction.rows[0],
      },
    });
  } catch (error) {
    // Rollback on error - undo all changes
    await client.query('ROLLBACK');
    if (error instanceof WalletError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error depositing funds:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    // Always release client back
    client.release();
  }
});

// 4. Withdraw Funds
app.post('/wallets/:id/withdraw', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { amount } = req.body;

    // Validation
    if (!isValidUUID(id)) {
      throw new WalletError(400, 'Invalid wallet ID format');
    }

    if (amount === undefined || amount === null) {
      throw new WalletError(400, 'Amount is required');
    }

    const amountNum = parseFloat(amount);
    if (!isValidAmount(amountNum)) {
      throw new WalletError(400, 'Amount must be a positive number');
    }

    await client.query('BEGIN');

    // Lock wallet row
    const walletResult = await client.query(
      'SELECT * FROM wallets WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (walletResult.rows.length === 0) {
      throw new WalletError(404, 'Wallet not found');
    }

    const wallet = walletResult.rows[0];
    const currentBalance = parseFloat(wallet.balance);

    // Check balance before withdrawing
    if (currentBalance < amountNum) {
      throw new WalletError(400, 'Insufficient balance');
    }

    const newBalance = (currentBalance - amountNum).toFixed(8);

    // Update balance
    await client.query(
      'UPDATE wallets SET balance = $1 WHERE id = $2',
      [newBalance, id]
    );

    // Create transaction record
    const transactionId = uuidv4();
    const now = new Date();
    const reference = `WITHDRAW-${transactionId.substring(0, 8)}`;

    const transaction = await client.query(
      'INSERT INTO transactions (id, wallet_id, type, amount, reference, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [transactionId, id, 'withdraw', amountNum.toString(), reference, now]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      data: {
        wallet: { ...wallet, balance: newBalance },
        transaction: transaction.rows[0],
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof WalletError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error withdrawing funds:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    client.release();
  }
});

// 5. Transfer Between Wallets
app.post('/wallets/transfer', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { fromWalletId, toWalletId, amount } = req.body;

    // Validation
    if (!fromWalletId || !toWalletId) {
      throw new WalletError(400, 'Both wallet IDs are required');
    }

    if (!isValidUUID(fromWalletId) || !isValidUUID(toWalletId)) {
      throw new WalletError(400, 'Invalid wallet ID format');
    }

    if (fromWalletId === toWalletId) {
      throw new WalletError(400, 'Cannot transfer to the same wallet');
    }

    if (amount === undefined || amount === null) {
      throw new WalletError(400, 'Amount is required');
    }

    const amountNum = parseFloat(amount);
    if (!isValidAmount(amountNum)) {
      throw new WalletError(400, 'Amount must be a positive number');
    }

    await client.query('BEGIN');

    // Lock both wallets in sorted order in case transfers happen simultaneously in opposite directions
    const walletIds = [fromWalletId, toWalletId].sort();
    const walletsResult = await client.query(
      'SELECT * FROM wallets WHERE id = ANY($1) FOR UPDATE',
      [walletIds]
    );

    if (walletsResult.rows.length !== 2) {
      throw new WalletError(404, 'One or both wallets not found');
    }

    const fromWallet = walletsResult.rows.find((w: Wallet) => w.id === fromWalletId);
    const toWallet = walletsResult.rows.find((w: Wallet) => w.id === toWalletId);

    if (!fromWallet || !toWallet) {
      throw new WalletError(404, 'One or both wallets not found');
    }

    // Can only transfer between wallets with same currency
    if (fromWallet.currency !== toWallet.currency) {
      throw new WalletError(400, 'Cannot transfer between different currencies');
    }

    // Check sender has enough balance
    const fromBalance = parseFloat(fromWallet.balance);
    if (fromBalance < amountNum) {
      throw new WalletError(400, 'Insufficient balance');
    }

    // Calculate new balances
    const newFromBalance = (fromBalance - amountNum).toFixed(8);
    const newToBalance = (parseFloat(toWallet.balance) + amountNum).toFixed(8);

    // Update both wallets
    await client.query(
      'UPDATE wallets SET balance = $1 WHERE id = $2',
      [newFromBalance, fromWalletId]
    );

    await client.query(
      'UPDATE wallets SET balance = $1 WHERE id = $2',
      [newToBalance, toWalletId]
    );

    // Create debit and credit functions, maintain audit trail
    const debitTransactionId = uuidv4();
    const creditTransactionId = uuidv4();
    const now = new Date();
    const reference = `TRANSFER-${debitTransactionId.substring(0, 8)}`;

    await client.query(
      'INSERT INTO transactions (id, wallet_id, type, amount, reference, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [debitTransactionId, fromWalletId, 'transfer_debit', amountNum.toString(), reference, now]
    );

    await client.query(
      'INSERT INTO transactions (id, wallet_id, type, amount, reference, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [creditTransactionId, toWalletId, 'transfer_credit', amountNum.toString(), reference, now]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      data: {
        fromWallet: { ...fromWallet, balance: newFromBalance },
        toWallet: { ...toWallet, balance: newToBalance },
        reference: reference,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof WalletError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error transferring funds:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    client.release();
  }
});

// 6. Get Wallet Details
app.get('/wallets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      throw new WalletError(400, 'Invalid wallet ID format');
    }

    // Get wallet information
    const walletResult = await pool.query('SELECT * FROM wallets WHERE id = $1', [id]);

    if (walletResult.rows.length === 0) {
      throw new WalletError(404, 'Wallet not found');
    }

    const wallet = walletResult.rows[0];

    // Get last 10 transactions transaction history 
    const transactionsResult = await pool.query(
      'SELECT * FROM transactions WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT 10',
      [id]
    );

    res.status(200).json({
      success: true,
      data: {
        wallet: wallet,
        transactions: transactionsResult.rows,
      },
    });
  } catch (error) {
    if (error instanceof WalletError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error getting wallet:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Health check endpoint, checking  if the API is running
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: ' ok' });
});

// Error handling 
app.use((err: any, req: Request, res: Response, _next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// We execute the entire schema.sql content here
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS wallets (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        currency VARCHAR(10) NOT NULL CHECK (currency IN ('USD', 'GOLD')),
        balance NUMERIC(18, 8) NOT NULL DEFAULT 0 CHECK (balance >= 0),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        UNIQUE(user_id, currency)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY,
        wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdraw', 'transfer_debit', 'transfer_credit')),
        amount NUMERIC(18, 8) NOT NULL CHECK (amount > 0),
        reference VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
    console.log("Database schema initialized");
  } catch (err) {
    console.error("Database error:", err);
  }
};
// Starting server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  await initDb(); // Ensures tables exist before users try to sign up
  console.log(`Server running on port ${PORT}`);
});