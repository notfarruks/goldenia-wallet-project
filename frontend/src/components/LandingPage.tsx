import React from 'react';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  return (
    <div className="landing-page">
      {/* Header */}
      <div className="header">
        <h1>💰 Goldenia Wallet</h1>
        <p>Send and receive money instantly</p>
        <a href="https://goldenia-wallet-ui.vercel.app/" className="btn">Try Live Demo</a>
      </div>

      <div className="container">
        {/* Features */}
        <div className="features">
          <div className="feature">
            <div className="feature-icon">⚡</div>
            <h3>Instant Transfers</h3>
            <p>Send money in seconds</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🔒</div>
            <h3>Secure</h3>
            <p>Your money is safe</p>
          </div>
          <div className="feature">
            <div className="feature-icon">📊</div>
            <h3>Track Everything</h3>
            <p>See all transactions</p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Create Wallet</h3>
            <p>Sign up in seconds</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Add Money</h3>
            <p>Deposit funds easily</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Send & Receive</h3>
            <p>Transfer instantly</p>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Demo */}
        <div className="demo-card">
          <h2>Your Wallet</h2>
          
          <div className="balance-card">
            <h3>Balance</h3>
            <div className="balance">$1,247.50</div>
          </div>

          <h3 style={{ color: '#555', marginBottom: '15px' }}>Recent Activity</h3>
          
          <div className="transaction">
            <div className="tx-info">
              <div className="tx-icon">📥</div>
              <div>
                <div className="tx-name">Deposit</div>
                <div className="tx-date">Jan 15, 2025</div>
              </div>
            </div>
            <div className="tx-amount positive">+$500.00</div>
          </div>

          <div className="transaction">
            <div className="tx-info">
              <div className="tx-icon">💸</div>
              <div>
                <div className="tx-name">Sent to John</div>
                <div className="tx-date">Jan 14, 2025</div>
              </div>
            </div>
            <div className="tx-amount negative">-$125.00</div>
          </div>

          <div className="transaction">
            <div className="tx-info">
              <div className="tx-icon">📥</div>
              <div>
                <div className="tx-name">From Sarah</div>
                <div className="tx-date">Jan 13, 2025</div>
              </div>
            </div>
            <div className="tx-amount positive">+$75.50</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer>
        <p><strong>Goldenia Wallet</strong></p>
        <p>Simple digital wallet for everyone</p>
        <p style={{ marginTop: '15px', fontSize: '0.9em' }}>Built by Farrukh Mammadov</p>
      </footer>
    </div>
  );
};

export default LandingPage;