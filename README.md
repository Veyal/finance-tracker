# Finance Tracker 💰

A personal finance tracker with a premium Kirby-themed UI. Log transactions with minimal input, then optionally enrich details later.

## Features

- 🔐 **Auth**: Username + 6-digit PIN with rate limiting
- 📝 **Transactions**: Create/edit/delete expenses and income
- 📅 **Calendar**: Monthly view with daily totals
- 📊 **Insights**: Breakdown by category, group, and payment method
- ⚙️ **Settings**: Manage categories, groups, and payment methods
- 📱 **Responsive**: Works on mobile, tablet, and desktop

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Development mode (runs both server and client)
npm run dev
```

Open http://localhost:5173 in your browser.

## Docker Setup 🐳

The project includes a Docker setup for both development and production, configured to solve cross-origin issues by checking everything through Nginx on a single port.

### Prerequisites

- Docker Desktop installed
- **SSL Certificates**:
  - Run `./generate-cert.sh` to generate self-signed certificates for local development.

### Development

Runs the app on **Port 80** locally.
- Frontend: `http://localhost/`
- API: `http://localhost/auth`, etc.

```bash
# Start development environment
docker compose -f docker-compose.dev.yml up --build
```

**Note for macOS Users**: The setup includes `.dockerignore` rules to prevent local `node_modules` (specifically native binaries like `bcrypt` or `better-sqlite3`) from being mounted into the Linux container, which prevents `invalid ELF header` errors.

### Production

Runs the app on **Port 443** (HTTPS).

```bash
# Start production environment
docker compose up --build -d
```

You can access the secure site at `https://localhost`.


## Production Deployment

```bash
# Build and start production server
npm run deploy
```

This builds the React app and starts the Express server on port 3001, serving both the API and the built frontend.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Server port |
| NODE_ENV | - | Set to `production` for production mode |

## Tech Stack

- **Frontend**: React + Vite + Vanilla CSS
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Auth**: bcrypt + httpOnly session cookies

## System Requirements

To run this application (especially via Docker), the following minimum specifications are recommended:

- **CPU**: 1 vCPU (2.0 GHz+)
- **RAM**: 1 GB minimum (2 GB recommended for build processes)
- **Disk**: 2 GB free space
- **OS**: Linux (Ubuntu 20.04+), macOS, or Windows using WSL2
- **Software**: Node.js v20+ (if running locally) or Docker Engine


## Project Structure

```
finance-tracker/
├── client/           # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── api/
│   │   └── styles/
│   └── dist/         # Built files (after npm run build)
├── server/           # Express backend
│   ├── routes/
│   ├── middleware/
│   └── db/
├── package.json      # Root package with scripts
└── README.md
```

## API Endpoints

### Auth
- `POST /auth/register` - Create account
- `POST /auth/login` - Login (rate limited: 3 attempts / 10 min)
- `POST /auth/logout` - Logout
- `GET /me` - Get current user

### Transactions
- `GET /transactions` - List with filters
- `POST /transactions` - Create (amount only required)
- `PATCH /transactions/:id` - Update
- `DELETE /transactions/:id` - Soft delete

### Categories / Groups / Payment Methods
- `GET /[resource]` - List
- `POST /[resource]` - Create
- `PATCH /[resource]/:id` - Update
- `DELETE /[resource]/:id` - Archive

## License

MIT
