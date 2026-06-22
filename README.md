# KALA IS ART — Premium CRM & Business Platform

> Luxury art consultation business CRM built with React + Node.js + PostgreSQL

---

## 🚀 Quick Start

### 1. Database Setup
```bash
# Create database in PostgreSQL
psql -U postgres -c "CREATE DATABASE kala_is_art;"

# Configure backend .env
cd backend
cp .env.example .env
# Edit .env and fill in your PostgreSQL credentials, SMTP, and Razorpay keys

# Initialize schema + seed data
npm run db:init
```

### 2. Start Backend
```bash
cd backend
npm install
npm run dev   # runs on http://localhost:5000
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev   # runs on http://localhost:3000
```

---

## 🔐 Default Admin
After `npm run db:init`, log in at `/login`:
- Email: `admin@kalaisart.com`
- Password: Set `ADMIN_INITIAL_PASSWORD` in your `.env` before running db:init

---

## 📁 Project Structure

```
kala is art/
├── backend/
│   ├── server.js              # Entry point
│   ├── src/
│   │   ├── app.js             # Express app with all middleware
│   │   ├── config/
│   │   │   ├── database.js    # PostgreSQL connection pool
│   │   │   ├── logger.js      # Winston logger
│   │   │   ├── schema.sql     # Complete DB schema
│   │   │   └── initDb.js      # DB initialization script
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── lead.controller.js
│   │   │   ├── estimate.controller.js
│   │   │   ├── subscription.controller.js
│   │   │   ├── accounting.controller.js
│   │   │   └── dashboard.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js     # JWT + RBAC
│   │   │   ├── audit.middleware.js    # Activity logging
│   │   │   └── upload.middleware.js   # Multer
│   │   ├── routes/            # All API routes
│   │   ├── jobs/
│   │   │   └── followupScheduler.js  # cron jobs
│   │   └── utils/
│   │       ├── email.js        # Nodemailer templates
│   │       ├── pdfGenerator.js # Luxury estimate PDFs
│   │       └── notification.js # In-app notifications
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── App.jsx            # Router + guards
    │   ├── main.jsx           # Redux + React Query setup
    │   ├── index.css          # Global luxury design system
    │   ├── store/             # Redux slices (auth, ui, notifications)
    │   ├── services/api.js    # Axios client with auto token refresh
    │   ├── components/
    │   │   ├── layout/        # Sidebar, Topbar, AppLayout, AuthLayout
    │   │   └── leads/         # LeadModal
    │   └── pages/
    │       ├── auth/          # Login, Register, ForgotPassword
    │       ├── DashboardPage  # Charts, stats, follow-ups
    │       ├── leads/         # LeadsPage, LeadDetailPage
    │       ├── clients/       # ClientsPage, ClientDetailPage
    │       ├── estimates/     # EstimatesPage, EstimateFormPage
    │       ├── accounting/    # ExpensesPage, IncomePage
    │       ├── admin/         # AdminDashboardPage, AdminUsersPage
    │       ├── FollowUpsPage
    │       ├── SubscriptionPage  # Razorpay integration
    │       ├── NotificationsPage
    │       └── ProfilePage
    └── vite.config.js
```

---

## 🔑 Environment Variables (backend/.env)

```env
NODE_ENV=development
PORT=5000

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kala_is_art
DB_USER=postgres
DB_PASSWORD=your_pg_password

# JWT (generate strong random strings)
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# SMTP (Gmail App Password recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=noreply@kalaisart.com

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# Encryption (for sensitive data)
ENCRYPTION_KEY=your_32_byte_hex_key
```

---

## 🌐 API Endpoints

| Module | Endpoint |
|--------|----------|
| Auth | `POST /api/auth/register` `/login` `/verify-otp` `/refresh` |
| Leads | `GET/POST /api/leads` `PUT/DELETE /api/leads/:id` |
| Clients | `GET/POST /api/clients` `PUT /api/clients/:id` |
| Follow-Ups | `GET/POST /api/followups` `PUT /api/followups/:id` |
| Estimates | `GET/POST /api/estimates` `GET /api/estimates/:id/pdf` |
| Expenses | `GET/POST /api/expenses` |
| Income | `GET/POST /api/income` |
| Subscription | `GET /api/subscriptions/plans` `POST /api/subscriptions/create-order` |
| Dashboard | `GET /api/dashboard` |
| Admin | `GET /api/admin/users` `GET /api/admin/revenue` |

---

## 🎨 Tech Stack

**Frontend:** React 18, Vite, Tailwind CSS v4, Framer Motion, Redux Toolkit, React Query, Recharts, Lucide Icons, MUI

**Backend:** Node.js, Express, PostgreSQL, JWT, bcryptjs, Nodemailer, Razorpay, node-cron, Multer, Winston, Helmet

---

## 📞 Support
Kailash Commercial Complex, Vikhroli West, Mumbai
