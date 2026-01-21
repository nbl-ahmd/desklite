# Desklite - Shop Ledger & Khata Management

A modern, production-ready Progressive Web App (PWA) designed for Kerala shopkeepers to manage daily transactions, customer credit (khata), and business analytics. Built with real shops in mind - grocery stores, kirana shops, bakeries, barbers, wholesale traders, and more.

## ✨ Key Features

### 🏪 Core Business Features
- **Quick Transaction Entry** - Fast income/expense logging with cash, UPI, or credit
- **Customer Khata (Credit Ledger)** - Track who owes you money with one-tap WhatsApp reminders
- **Lena/Dena Dashboard** - Clear view of receivables and payables
- **Daily Summary (Hisab)** - Close your books daily with shareable reports
- **UPI QR Code** - Display your payment QR for customers to scan

### 📊 Reports & Analytics
- **Date-wise Filtering** - Today, This Week, This Month, All Time
- **Payment Mode Breakdown** - Cash vs UPI vs Credit analysis
- **Customer Spending Patterns** - Identify top customers
- **PDF & Excel Exports** - Professional reports for your records

### 📱 Mobile-First Design
- **PWA Support** - Install on any device, works offline
- **Offline-First Sync** - Record transactions without internet
- **Simple UI** - Easy to use even for non-tech users
- **Malayalam Support** - Local language option

### 🔒 Production-Ready Security
- **Rate Limiting** - Protection against brute force attacks
- **Helmet Security Headers** - Industry-standard HTTP security
- **JWT Authentication** - Secure session management
- **Input Validation** - Protected against injection attacks
- **CORS Configuration** - Controlled API access

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose ODM |
| Authentication | NextAuth.js with JWT |
| PWA | Service Workers, Web Manifest |
| Security | Helmet, express-rate-limit, bcrypt |
| PDF Generation | Puppeteer |
| Excel Export | SheetJS (xlsx) |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- MongoDB 5.0+ (Atlas or local)
- Git

### Quick Start (Development)

```bash
# Clone the repository
git clone https://github.com/your-username/desklite.git
cd desklite

# Install all dependencies (root, client, server)
npm install

# Copy environment files
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI and JWT secret

# Start development servers (both client and server)
npm run dev
```

The application will be available at:
- 🌐 Frontend: http://localhost:3000
- ⚙️ Backend API: http://localhost:5000
- ❤️ Health Check: http://localhost:5000/health

### Environment Variables

#### Server (`server/.env`)
```env
# Required
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/desklite
JWT_SECRET=your-64-character-secure-secret

# Optional
PORT=5000
NODE_ENV=development
```

#### Client (`client/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

## 📁 Project Structure

```
desklite/
├── client/                   # Next.js 14 Frontend
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── dashboard/   # Protected dashboard routes
│   │   │   │   ├── customers/   # Customer khata page
│   │   │   │   ├── transactions/ # Transaction history
│   │   │   │   ├── reports/     # Analytics & exports
│   │   │   │   └── settings/    # User preferences
│   │   │   ├── login/       # Authentication
│   │   │   └── register/    # New user signup
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React context providers
│   │   ├── lib/             # Utilities, API client
│   │   └── utils/           # Helper functions
│   └── public/              # PWA assets, icons
│
├── server/                   # Express.js Backend
│   └── src/
│       ├── routes/          # API endpoints
│       │   ├── auth.js      # Authentication
│       │   ├── transactions.js # CRUD for transactions
│       │   ├── customers.js # Customer aggregation
│       │   ├── summary.js   # Analytics endpoints
│       │   └── pdf.js       # Report generation
│       ├── models/          # Mongoose schemas
│       ├── middleware/      # Auth, rate limiting
│       └── jobs/            # Background tasks
│
└── package.json             # Monorepo root config
```

## 🔧 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login with credentials |
| GET | `/api/auth/me` | Get current user |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List transactions (paginated) |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List all customers |
| GET | `/api/customers/receivables` | Get credit outstanding |
| GET | `/api/customers/:name` | Customer details |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/summary` | Transaction summary |
| GET | `/api/summary/daily` | Today's summary |
| POST | `/api/pdf/export` | Generate PDF report |

## 🏭 Production Deployment

### Build for Production

```bash
# Build client
cd client && npm run build

# The server is ready to run with Node.js
cd server && npm run start:prod
```

### Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT_SECRET (64+ characters)
- [ ] Configure CORS for your domain
- [ ] Set up MongoDB Atlas with IP whitelist
- [ ] Enable SSL/HTTPS
- [ ] Configure rate limiting for your traffic
- [ ] Set up monitoring (optional: Sentry, PM2)
- [ ] Test health endpoint: `GET /health`

### Recommended Platforms

- **Frontend**: Vercel (recommended), Netlify, AWS Amplify
- **Backend**: Railway, Render, DigitalOcean App Platform, AWS EC2
- **Database**: MongoDB Atlas (free tier available)

## 🎯 Target Users (Kerala Shops)

This app is specifically designed for:

| Shop Type | Key Features They Use |
|-----------|----------------------|
| 🏪 Kirana/Grocery | Daily credit tracking, UPI payments |
| 🍎 Fruit/Vegetable | Quick cash entries, daily summary |
| 🍞 Bakery | Expense tracking, customer history |
| 💈 Barber | Daily collections, simple interface |
| 🎁 Fancy/Gift Shop | Credit management, reports |
| 📦 Wholesale | Party ledger, bulk exports |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by Khatabook and Vyapar
- Built for the hardworking shopkeepers of Kerala
- Made with ❤️ for small businesses 