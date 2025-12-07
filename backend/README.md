# Elevare Backend

## Overview

The Elevare backend is a Node.js + Express application that provides RESTful APIs and WebSocket services for the Elevare collaborative learning platform.

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4+
- **Database**: PostgreSQL 15+
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **File Upload**: Multer
- **Real-time**: Socket.io
- **Validation**: express-validator
- **Language**: TypeScript 5+

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.ts  # Database connection
│   │   └── env.ts       # Environment variables
│   ├── middleware/      # Express middleware
│   │   ├── auth.ts      # JWT authentication
│   │   ├── validation.ts # Request validation
│   │   └── errorHandler.ts # Error handling
│   ├── routes/          # API routes
│   │   ├── auth.ts      # Authentication routes
│   │   ├── tasks.ts     # Task management routes
│   │   ├── notes.ts     # Note management routes
│   │   ├── groups.ts    # Study group routes
│   │   ├── resources.ts # Resource sharing routes
│   │   ├── files.ts     # File management routes
│   │   ├── whiteboards.ts # Whiteboard routes
│   │   └── search.ts    # Search routes
│   ├── controllers/     # Route controllers
│   ├── models/          # Data models
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── websocket/       # WebSocket handlers
│   └── app.ts           # Express app setup
├── migrations/          # Database migrations
├── tests/               # Test files
├── uploads/             # File uploads (development)
├── .env.example         # Environment variables template
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 15 or higher
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Run database migrations:
   ```bash
   npm run migrate
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## Environment Variables

See `.env.example` for required environment variables:

- `PORT`: Server port (default: 5000)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRES_IN`: Token expiration time (default: 24h)
- `NODE_ENV`: Environment (development/production)
- `CORS_ORIGIN`: Allowed CORS origins

## API Documentation

API endpoints follow RESTful conventions:

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/tasks` - Get user tasks
- `POST /api/tasks` - Create new task
- `GET /api/notes` - Get user notes
- `POST /api/groups` - Create study group
- And more...

Full API documentation will be available at `/api/docs` when the server is running.

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Development

### Code Style

- Use TypeScript for type safety
- Follow ESLint configuration
- Use Prettier for code formatting
- Write meaningful commit messages

### Database Migrations

Create a new migration:
```bash
npm run migrate:create migration-name
```

Run migrations:
```bash
npm run migrate
```

Rollback last migration:
```bash
npm run migrate:rollback
```

## Deployment

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm start
```

## License

This project is part of a Final Year Project and is for educational purposes.
