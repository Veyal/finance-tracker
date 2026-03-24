# Finance Tracker - Gemini CLI Guidelines

## 🛠 Skills Mandate
- **ALWAYS** invoke relevant skills using `activate_skill` before performing complex tasks.
- If a task involves debugging, use `systematic-debugging`.
- If a task involves new features, use `brainstorming` followed by `writing-plans`.
- ALWAYS use `verification-before-completion` before declaring a task finished.

## 🏗 Project Architecture

### Tech Stack
- **Frontend**: React (Vite), TypeScript/JSX, Vanilla CSS (Premium/Cyber aesthetic).
- **Backend**: Node.js Express.
- **Database**: SQLite (via `better-sqlite3`).
- **Communication**: REST API with `credentials: 'include'` for cookie-based sessions.

### Key Directory Structure
- `/client`: React application.
  - `/src/api/api.js`: Centralized API client.
  - `/src/styles/index.css`: Global design system and premium modal styles.
  - `/src/pages/SettingsPage.jsx`: Main settings and data management hub.
- `/server`: Express backend.
  - `/db/database.js`: Database initialization and migrations.
  - `/routes`: API endpoints (transactions, data import/export, auth, etc.).

## 🔑 Critical Logic & Conventions

### UI/UX Standards
- **Modals**: Must use `.modal-overlay` and `.modal` classes with `display: flex` and `flex-direction: column`.
- **Responsive Design**: Use `dvh` units for max-heights and `env(safe-area-inset-bottom)` for mobile action bars.
- **Close Buttons**: Always use the `.btn-close` class for consistent premium circular "X" buttons.
- **Privacy Mode**: Sensitive amounts are masked via `PrivacyContext` when `isPrivacyMode` is true.

### Data Management
- **Bulk Insert**: Supports JSON import with duplicate detection. Review UI allows editing and discarding items before final merge.
- **Import/Restore**: Overwrites the entire user database.
- **Payload Limits**: Backend is configured for **10MB** JSON payloads to support large backups.

### Database Migrations
- Check `server/db/database.js` for existing migration logic.
- Ensure new columns like `deleted_at` and `related_transaction_id` are checked during startup to support older databases.

## 🚀 Development
- Root command: `npm run dev` (starts both client and server concurrently).
- Client runs on `http://localhost:5173`.
- Server runs on `http://localhost:3001` (proxied by Vite).

## 🚢 Deployment & Production
- **Deployment Policy**: **NEVER** run the deployment script or deploy to production unless explicitly requested by the user for the current task.
- **Production Server**: `tracker.veyal.org` (User: `des`, IP: `70.153.26.35`)
- **Deployment Script**: Use `./deploy.sh` in the `finance-tracker` root directory.
  - The script automatically builds the React client, syncs files via `rsync` (using `sshpass`), installs dependencies on the server, and restarts the PM2 process.
- **Database Backup**: **Always** back up the production database before deploying.
  - Command to backup: `mkdir -p backups/veyal && sshpass -p 'P@ssw0rd123!@#' scp -o StrictHostKeyChecking=no des@70.153.26.35:/home/des/apps/finance-tracker/server/finance.db* backups/veyal/`
- **PM2 Config**: Managed via `ecosystem.config.cjs`.
- **Note**: The Docker deployment (`deploy-docker.sh`) is currently ignored; stick to the standard PM2 deployment script.