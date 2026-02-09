
# Goldenia Wallet Project

A mini wallet and transaction management system built with Node.js, Express, PostgreSQL, and React.

**Live Backend (Railway):** https://enchanting-optimism-production.up.railway.app  
**Health Check:** https://enchanting-optimism-production.up.railway.app/health

> Note: The base URL may return 404. Please use documented API endpoints or the `/health` endpoint.

## Project Structure

```
goldenia-wallet-project/
├── backend/              # Node.js/Express API
│   ├── src/             # TypeScript source files
│   ├── package.json
│   ├── schema.sql       # Database schema
│   └── tsconfig.json
├── frontend/            # React UI
│   ├── src/             # React components
│   ├── public/          # Static files
│   └── package.json
└── README.md
```

##   Features

* Create and manage digital wallets
* Process transactions between wallets
* View transaction history
* Real-time balance updates
* RESTful API

## Local Development

Local development uses a PostgreSQL instance running on localhost.

### Prerequisites

* Node.js 16+
* PostgreSQL 12+

### Backend Setup

```bash
cd backend
npm install

# Setup database
createdb goldenia
psql goldenia < schema.sql

# Create .env file with these variables:
# DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/goldenia
# PORT=3000
# NODE_ENV=development

# Start development server
npm run dev
```

Backend runs on: http://localhost:3000

### Production-style local run
```bash
npm run build
npm start
```

### Frontend Setup

```bash
cd frontend
npm install

# Start development server
npm start
```

Frontend runs on: http://localhost:3001

## API Endpoints

### Users
* `POST /users` - Create user (email must be unique)

### Wallets
* `POST /wallets` - Create wallet (one wallet per currency per user)
* `POST /wallets/:id/deposit` - Deposit funds
* `POST /wallets/:id/withdraw` - Withdraw funds
* `POST /wallets/transfer` - Transfer between wallets (same currency)
* `GET /wallets/:id` - Get wallet details + last 10 transactions

### Health
* `GET /health` - API health check


## Example API Requests (curl)

Below are example requests using the live Railway deployment.  
Replace placeholder IDs with actual values returned from previous responses.

```bash
# 1. Create User
curl -X POST https://enchanting-optimism-production.up.railway.app/users \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com"}'

# 2. Create Wallet (USD)
curl -X POST https://enchanting-optimism-production.up.railway.app/wallets \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "REPLACE_WITH_USER_ID",
    "currency": "USD"
  }'

# 3. Deposit Funds
curl -X POST https://enchanting-optimism-production.up.railway.app/wallets/REPLACE_WITH_WALLET_ID/deposit \
  -H "Content-Type: application/json" \
  -d '{"amount": 100.50}'

# 4. Withdraw Funds
curl -X POST https://enchanting-optimism-production.up.railway.app/wallets/REPLACE_WITH_WALLET_ID/withdraw \
  -H "Content-Type: application/json" \
  -d '{"amount": 25.25}'

# 5. Transfer Between Wallets
curl -X POST https://enchanting-optimism-production.up.railway.app/wallets/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "fromWalletId": "WALLET_ID_1",
    "toWalletId": "WALLET_ID_2",
    "amount": 10.00
  }'

# 6. Get Wallet Details (Last 10 Transactions)
curl https://enchanting-optimism-production.up.railway.app/wallets/REPLACE_WITH_WALLET_ID
```

## Design Decisions

### Two Records Per Transfer

Every transfer creates both a debit (money out) and credit (money in) record. This gives  transaction history for wallets.

### UUIDs for IDs

Used random UUIDs instead of simple numbers (1, 2, 3...) because they are unique and more secure.

### Row Locking

When processing a transfer, the wallet row gets locked so two transfers can't happen at the exact same time. This prevents spending the same money twice.

### RESTful API

Used standard REST patterns (GET, POST) with clear URLs like `/wallets` and `/users` to make the API easy to understand and use.

### Custom Error Class

Created `WalletError` to handle all errors in one place instead of repeating error code everywhere.

## Assumptions

* **Instant Transfers** : Transfers happen immediately, not scheduled
* **No Login System** : No user authentication
* **One Wallet Per Person** : Each wallet belongs to only one user
* **Two Decimal Places** : Amounts like $10.50 are allowed
* **No Undo** : Completed transactions cannot be reversed

## Edge Cases Handled

### Not Enough Money

Checks if sender has enough balance before sending. Returns error if balance is too low.

### Multiple Transfers at Once

Locks the wallet when processing to prevent two transfers from using the same money.

### Invalid Amounts

Rejects negative numbers, zero, or non-numeric amounts.

### Wallet Doesn't Exist

Returns "not found" error if trying to use a wallet that doesn't exist.

### Database Errors

If anything goes wrong, all changes are undone automatically.

### Duplicate Requests

Each transaction has a unique ID. Full idempotency (e.g. using an Idempotency-Key) can be added if required.

## Deployment (Railway)

To deploy the backend on Railway:

1. Deploy the backend service with **Root Directory set to `backend/`**
2. Add a PostgreSQL service
3. In the backend service **Variables**, set:

   DATABASE_URL = ${{ Postgres.DATABASE_URL }}

4. Deploy

## Tech Stack

**Backend:**

* Node.js
* Express.js
* TypeScript
* PostgreSQL
* CORS (enables cross-origin requests)

**Frontend:**

* React
* JavaScript
* CSS

## 📝 License

MIT

## Author

Farrukh Mammadov
