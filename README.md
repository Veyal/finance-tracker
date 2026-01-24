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

## Docker Development 🐳

The project includes a Docker setup for local development.

### Prerequisites
- Docker Desktop installed
- **SSL Certificates**: Run `./generate-cert.sh` to generate self-signed certificates for local development.

### Start Dev Server
Runs the app on **Port 80** locally.
```bash
docker compose -f docker-compose.dev.yml up --build
```
**Note:** The setup includes `.dockerignore` rules to avoid mounting local `node_modules` into the container.

## Deployment 🚀

You can deploy this application using either Docker (recommended) or PM2.

### Option 1: Docker Deployment (Recommended) 🐳

This method runs the application in isolated containers with Nginx handling SSL and reverse proxying.

**Prerequisites:**
- Docker & Docker Compose installed on the server.
- SSH access to the server.

**Steps:**
1. Configure your server details in `deploy-docker.sh`:
   - `SERVER`: SSH connection string (e.g., `user@ip`).
   - `HOST`: Domain name (e.g., `tracker.example.com`).
2. Run the deployment script:
   ```bash
   ./deploy-docker.sh
   ```

**What this does:**
- Builds the Docker image directly on the remote server.
- Sets up Nginx to serve the app on port 443 (HTTPS) and port 80 (HTTP redirect).
- Data is persisted in a Docker volume.

### Option 2: PM2 Deployment (Traditional) ⚡

This method runs the application directly on the server's Node.js environment.

**Prerequisites:**
- Node.js (v20+) installed on the server.
- PM2 installed globally on the server (`npm install -g pm2`).
- Nginx (or another reverse proxy) configured manually if you want to expose it on port 80/443.

**Steps:**
1. Configure your server details in `deploy.sh`:
   - `SERVER`: SSH connection string.
   - `REMOTE_PATH`: Directory to deploy to.
2. Run the deployment script:
   ```bash
   ./deploy.sh
   ```

**What this does:**
- Builds the React client locally.
- Syncs the built assets and server code to the remote server using `rsync`.
- Installs production dependencies on the server.
- Starts/Restarts the application using PM2 on port 3001.

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
