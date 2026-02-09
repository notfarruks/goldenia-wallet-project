import React, { useState } from 'react';
import './App.css';

// TypeScript interfaces 
interface User {
  id: string;
  email: string;
}

interface Wallet {
  id: string;
  userId: string;
  currency: 'USD' | 'GOLD';
  balance: string;
}

interface Transaction {
  id: string;
  walletId: string;
  type: string;
  amount: string;
  reference: string;
  createdAt: string;
}

export default function App() {
  // React hooks like useState to allow us  track and update data in the component
  const [apiUrl] = useState('http://localhost:3000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Forming input states to track what user is typing
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [walletId, setWalletId] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'GOLD'>('USD');
  const [amount, setAmount] = useState('');
  const [toWalletId, setToWalletId] = useState('');

  // Display states to store data received from APIs
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  //  Clear alert messages
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // Handle user creation and async/await to handle APIs  
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent form from refreshing the page while submitting
    clearMessages();
    setLoading(true);

    try {
      // Send POST request to create user
      const res = await fetch(`${apiUrl}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create user');
      }

      const data = await res.json();
      setUser(data.data);
      setUserId(data.data.id); // Auto-fill user ID for wallet creation
      setEmail('');
      setSuccess(`User created: ${data.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false); // Always stops loading state at the end of the operation
    }
  };

  // Handle wallet creation
  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    // Ensure user ID exists
    if (!userId) {
      setError('Please create or enter a user ID first');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/wallets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, currency }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create wallet');
      }

      const data = await res.json();
      setWallet(data.data);
      setWalletId(data.data.id); // Fill wallet ID for transactions
      setSuccess(`${currency} Wallet created: ${data.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Handle deposit
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!walletId) {
      setError('Please create or select a wallet first');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/wallets/${walletId}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to deposit');
      }

      const data = await res.json();
      setWallet(data.data.wallet); // Update wallet with new balance
      setTransactions([data.data.transaction, ...transactions]); // Add new transaction to the list
      setAmount('');
      setSuccess(`Deposited ${amount} ${wallet?.currency}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Handle withdrawal
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!walletId) {
      setError('Please create or select a wallet first');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/wallets/${walletId}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to withdraw');
      }

      const data = await res.json();
      setWallet(data.data.wallet);
      setTransactions([data.data.transaction, ...transactions]);
      setAmount('');
      setSuccess(`Withdrew ${amount} ${wallet?.currency}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Handle transfers
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!walletId || !toWalletId) {
      setError('Please select both wallets');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/wallets/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromWalletId: walletId,
          toWalletId,
          amount: parseFloat(amount),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to transfer');
      }

      const data = await res.json();
      setWallet(data.data.fromWallet);
      setAmount('');
      setToWalletId('');
      setSuccess(`Transferred ${amount} to wallet ${toWalletId.substring(0, 8)}`);
      
      // Refresh wallet to get updated balance and transactions
      await handleGetWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Load wallet details and transaction history
  const handleGetWallet = async () => {
    clearMessages();

    if (!walletId) {
      setError('Please enter a wallet ID');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/wallets/${walletId}`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch wallet');
      }

      const data = await res.json();
      setWallet(data.data.wallet);
      setTransactions(data.data.transactions);
      setSuccess('Wallet loaded');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // UI layout
  // Conditional rendering with && and ternary operators
  return (
    <div className="app">
      <header className="header">
        <h1>💰 Goldenia Wallet</h1>
        <p>Mini Wallet & Transactions API</p>
      </header>

      {/* Shows error or success messages*/}
      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <div className="container">
        {/* Create User */}
        <div className="section">
          <h2>Step 1: Create User</h2>
          <form onSubmit={handleCreateUser}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </form>
          {user && <p className="info">✓ User ID: {user.id}</p>}
        </div>

        {/* Create Wallet */}
        <div className="section">
          <h2>Step 2: Create Wallet</h2>
          <form onSubmit={handleCreateWallet}>
            <input
              type="text"
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={loading}
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'USD' | 'GOLD')}
              disabled={loading}
            >
              <option value="USD">USD</option>
              <option value="GOLD">GOLD</option>
            </select>
            <button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Wallet'}
            </button>
          </form>
          {wallet && (
            <div className="info">
              <p>✓ Wallet ID: {wallet.id}</p>
              <p>Currency: {wallet.currency}</p>
              <p>Balance: {wallet.balance}</p>
            </div>
          )}
        </div>

        {/* Manage Funds */}
        <div className="section">
          <h2>Step 3: Manage Funds</h2>
          <div className="wallet-selector">
            <input
              type="text"
              placeholder="Wallet ID"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              disabled={loading}
            />
            <button onClick={handleGetWallet} disabled={loading}>
              Load Wallet
            </button>
          </div>

          {/* Wallet operations after wallet is loaded */}
          {wallet && (
            <>
              <div className="balance-card">
                <h3>{wallet.currency} Wallet</h3>
                <div className="balance">{wallet.balance}</div>
              </div>

              {/* Deposit form */}
              <div className="form-group">
                <h4>Deposit</h4>
                <form onSubmit={handleDeposit}>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.00000001"
                    disabled={loading}
                  />
                  <button type="submit" disabled={loading}>
                    Deposit
                  </button>
                </form>
              </div>

              {/* Withdraw form */}
              <div className="form-group">
                <h4>Withdraw</h4>
                <form onSubmit={handleWithdraw}>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.00000001"
                    disabled={loading}
                  />
                  <button type="submit" disabled={loading}>
                    Withdraw
                  </button>
                </form>
              </div>

              {/* Transfer form */}
              <div className="form-group">
                <h4>Transfer</h4>
                <form onSubmit={handleTransfer}>
                  <input
                    type="text"
                    placeholder="To Wallet ID"
                    value={toWalletId}
                    onChange={(e) => setToWalletId(e.target.value)}
                    disabled={loading}
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.00000001"
                    disabled={loading}
                  />
                  <button type="submit" disabled={loading}>
                    Transfer
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Transaction history in case of transactions */}
        {transactions.length > 0 && (
          <div className="section">
            <h2>Recent Transactions</h2>
            <div className="transactions">
              {/* display each transaction */}
              {transactions.map((tx) => (
                <div key={tx.id} className="transaction">
                  <div className="tx-type">{tx.type.toUpperCase()}</div>
                  <div className="tx-amount">{tx.amount}</div>
                  <div className="tx-ref">{tx.reference}</div>
                  <div className="tx-date">
                    {new Date(tx.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}