# Crickfin 🏏

Crickfin is a premium, modern Cricket League Management System designed to streamline cricket club operations, player stats, match scheduling, teams, payments, and expenses.

The frontend is built as a single-page application (SPA) with a custom design system inspired by the **Supabase Dark Emerald** aesthetic.

---

## 🚀 Key Features

*   **Executive Dashboard**: High-level visual statistics, charts, and league summaries.
*   **Player Profiles & Statistics**: Add, update, and track player performance data, roles, and status.
*   **Match Scheduling & Results**: Log match details, scores, opponents, status, and player participation.
*   **Financial Tracking**: Comprehensive management for both **Payments** (player fees) and **Expenses** (ground fees, equipment, etc.) with totals.
*   **Team Rosters**: Group players into custom teams and manage club lineups.
*   **Exportable Reports**: Print-friendly layouts for match summaries and financial balances.
*   **Dedicated Player Portal**: View personal performance stats and fee payment histories.
*   **Fully Mobile Responsive**: Optimized for phones, notched screens, and touch inputs.

---

## 🎨 Design System

Crickfin uses a curated design system documented in [DESIGN.md](DESIGN.md).
*   **Theme**: Deep Dark Mode (`#0b0d12` page canvas, `#11141d` panel cards).
*   **Accent**: Supabase Emerald Green (`#10b981`).
*   **Typography**: `Outfit` (headings) and `Inter` (body).

---

## 🛠️ Project Structure

```text
Crickfin/
├── backend/            # Express.js REST API server & SQLite database
│   ├── crickfin.db     # SQLite Database
│   ├── server.js       # Main server entrypoint
│   └── db.js           # Database connections and tables schema
│
├── frontend/           # Vite-powered SPA frontend
│   ├── src/
│   │   ├── views/      # Individual page views & layout component
│   │   ├── main.js     # Frontend bootstrap
│   │   ├── router.js   # Hash-based SPA routing
│   │   └── style.css   # Main dark-emerald responsive stylesheet
│   └── index.html      # Main HTML template
│
├── vercel.json         # Vercel deployment configuration
└── package.json        # Root workspace configuration
```

---

## 💻 Local Development

### Prerequisites
*   Node.js (v18+)
*   npm

### Installation
Run the helper script from the root directory to install dependencies for both frontend and backend:
```bash
npm run install:all
```

### Launch Development Servers
Run the following command to spin up the API backend (port 5000) and the Vite frontend (port 5173) concurrently:
```bash
npm run dev
```

---

## 🌐 Production Deployment

This project is configured to deploy directly to **Vercel** from the root repository directory.

The [vercel.json](vercel.json) file directs Vercel to automatically compile the Vite frontend from the `frontend/` directory and host it.

### Automatic GitHub Deployments
1. Push this repository to your GitHub account:
   ```bash
   git push -u origin main
   ```
2. Log in to [Vercel](https://vercel.com).
3. Import the `Crickfin` repository.
4. Vercel will automatically read [vercel.json](vercel.json), build the assets, and publish your project online!
