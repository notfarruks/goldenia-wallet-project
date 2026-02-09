
# Goldenia Wallet Project

A mini wallet and transaction management system built with Node.js, Express, PostgreSQL, and React.

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

### Frontend Setup

```bash
cd frontend
npm install

# Start development server
npm start
```

Frontend runs on: http://localhost:3001

## API Endpoints

### Wallets

* `POST /api/wallets` - Create new wallet
* `GET /api/wallets/:id` - Get wallet details
* `GET /api/wallets/:id/balance` - Get wallet balance

### Transactions

* `POST /api/transactions` - Create transaction
* `GET /api/transactions/:id` - Get transaction details
* `GET /api/transactions/wallet/:walletId` - Get wallet transactions

### Health

* `GET /health` - API health check

## Design Decisions

### Two Records Per Transfer

Every transfer creates both a debit (money out) and credit (money in) record. This gives  transaction history for wallets, based on real banking system.

### UUIDs for IDs

Used random UUIDs instead of simple numbers (1, 2, 3...) because they are unique and more secure.

### Row Locking

When processing a transfer, the wallet row gets locked so two transfers can't happen at the exact same time. This prevents spending the same money twice.

### RESTful API

Used standard REST patterns (GET, POST) with clear URLs like `/api/wallets` and `/api/transactions` to make the API easy to understand and use.

### Custom Error Class

Created `WalletError` to handle all errors in one place instead of repeating error code everywhere.

## Assumptions

* **Single Currency** : All money is in the same currency
* **Instant Transfers** : Transfers happen immediately, not scheduled
* **No Login System** : No user authentication
* **One Wallet Per Person** : Each wallet belongs to only one user
* **No Negative Balances** : Cannot spend more than in balance
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

Each transaction has a unique ID to prevent the same transfer from happening twice by accident.

## Deployment

This project is deployed on Railway.app

* Backend: Node.js service
* Frontend: React app
* Database: PostgreSQL

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
