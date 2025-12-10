# Elevare - Learning Management System

A modern, full-stack learning management system built with Next.js, Node.js, Express, and PostgreSQL.

## 🚀 Features

- **User Authentication** with JWT tokens
- **Email Verification** via OTP (One-Time Password)
- **Secure Password Management** with bcrypt hashing
- **Password Reset** functionality
- **Protected Routes** and role-based access
- **Real-time Updates** with WebSocket support
- **Responsive Design** with Tailwind CSS
- **Dark Mode** support



## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT (jsonwebtoken)
- **Email**: Nodemailer (SMTP)
- **Validation**: express-validator
- **Security**: bcrypt, helmet, cors

## 📁 Project Structure

```
elevare/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Route controllers
│   │   ├── db/              # Database connection & migrations
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Utility functions
│   │   ├── app.ts           # Express app setup
│   │   └── server.ts        # Server entry point
│   ├── scripts/             # Setup scripts
│   ├── logs/                # Application logs
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js pages (App Router)
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── libs/            # Libraries & utilities
│   │   └── types/           # TypeScript types
│   └── package.json
│
└── design-references/       # UI/UX design files
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- SMTP email account (Gmail, SendGrid, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd elevare
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Setup Database**
   ```bash
   # Create database
   createdb elevare_dev
   
   # Run migrations
   psql -U postgres -d elevare_dev -f src/db/migrations/create_tables.sql
   psql -U postgres -d elevare_dev -f src/db/migrations/add_otp_verification.sql
   ```

4. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start Development Servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

6. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001

## 🔐 Environment Variables

### Backend (.env)

```env
# Server
NODE_ENV=development
PORT=5001
API_URL=http://localhost:5001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=elevare_dev
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_EXPIRES_IN=24h

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@elevare.com

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env)

```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/verify-otp` | Verify email with OTP | No |
| POST | `/api/auth/resend-otp` | Resend OTP code | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/forgot-password` | Request password reset | No |
| POST | `/api/auth/reset-password` | Reset password | No |
| GET | `/api/auth/me` | Get current user | Yes |
| PUT | `/api/auth/profile` | Update profile | Yes |

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Manual Testing
See [backend/API_TESTING_EXAMPLES.md](backend/API_TESTING_EXAMPLES.md) for curl commands and Postman collection.

## 🔒 Security Features

- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Authentication**: Secure token-based auth
- **OTP Verification**: 6-digit codes with 10-minute expiration
- **Rate Limiting**: 100 requests per 15 minutes
- **Attempt Limiting**: Max 5 failed OTP attempts
- **SMTP TLS**: Encrypted email transmission
- **Input Validation**: express-validator
- **SQL Injection Protection**: Parameterized queries
- **CORS**: Configured for specific origins
- **Helmet**: Security headers

## 📝 User Flow

1. **Registration**
   - User fills registration form
   - System generates 6-digit OTP
   - OTP sent via email
   - User redirected to verification page

2. **Email Verification**
   - User enters OTP from email
   - System validates OTP (expiry, attempts)
   - On success: email marked verified, JWT issued
   - User redirected to dashboard

3. **Login**
   - User enters credentials
   - System checks email verification
   - If not verified: redirect to OTP page
   - If verified: JWT issued, access granted

## 🐛 Troubleshooting

### Email Not Sending
- Check SMTP credentials in `.env`
- Verify port 587 is open
- Check spam folder
- Review logs: `backend/logs/app.log`

### OTP Not Working
- Check OTP hasn't expired (10 minutes)
- Verify attempts < 5
- Try resending OTP
- Check database for OTP record

### Database Connection Failed
- Verify PostgreSQL is running
- Check credentials in `.env`
- Ensure database exists
- Check firewall settings

See [OTP_CHECKLIST.md](OTP_CHECKLIST.md) for complete troubleshooting guide.

## 🚀 Deployment

### Backend Deployment

1. Build the application
   ```bash
   npm run build
   ```

2. Set production environment variables

3. Run migrations on production database

4. Start the server
   ```bash
   npm start
   ```

### Frontend Deployment

1. Build the application
   ```bash
   npm run build
   ```

2. Deploy to Vercel, Netlify, or your hosting provider

### Production Checklist

- [ ] Use production SMTP service (SendGrid, Mailgun, AWS SES)
- [ ] Set strong JWT secret (32+ characters)
- [ ] Enable HTTPS
- [ ] Configure proper CORS origins
- [ ] Set up database backups
- [ ] Configure monitoring and alerts
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure CDN for static assets
- [ ] Set up CI/CD pipeline

## 📄 License

This project is licensed under the MIT License.

## 👥 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📞 Support

For issues and questions:
- Check documentation in `/backend` and root directory
- Review troubleshooting guides
- Check application logs
- Open an issue on GitHub

## 🎯 Roadmap

- [ ] Social authentication (Google, Facebook)
- [ ] SMS OTP as backup
- [ ] Two-factor authentication (2FA)
- [ ] Course management system
- [ ] Assignment submission
- [ ] Real-time chat
- [ ] Video conferencing integration
- [ ] Mobile app (React Native)

---

Built with ❤️ by the Elevare Team
