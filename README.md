# Ledger Book SaaS

A Progressive Web App (PWA) for small shopkeepers to manage daily transactions and view analytics.

## Features

- 🔐 Google Sign-In Authentication
- 💵 Transaction Management (Cash, UPI, Credit)
- 📊 Transaction Analytics & Filtering
- 📱 PWA Support with Offline Capabilities
- 📈 Daily Sales Summary

## Tech Stack

- **Frontend**: Next.js (App Router), Tailwind CSS
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Authentication**: Firebase Auth
- **PWA**: Service Workers, Web Manifest

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- Firebase Account

### Environment Setup

1. Clone the repository
2. Create `.env` files in both `client` and `server` directories:

```bash
# client/.env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# server/.env
MONGODB_URI=your_mongodb_uri
PORT=5000
```

### Installation

```bash
# Install dependencies
npm install

# Run development servers
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Project Structure

```
ledger-book-saas/
├── client/                 # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # Reusable components
│   ├── lib/              # Utility functions
│   └── public/           # Static assets
├── server/                # Express backend
│   ├── controllers/      # Route controllers
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   └── middleware/      # Custom middleware
└── package.json          # Root package.json
```

## License

MIT 