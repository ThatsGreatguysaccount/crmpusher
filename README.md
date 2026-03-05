# CRMPusher

Lead forwarding middleware between Zapier (Facebook Lead Ads) and RichardCRM.

## How it works

```
Facebook Lead Ads → Zapier (MySQL Zap) → MySQL Table → CRMPusher Poller → RichardCRM API
```

1. Affiliator connects Facebook Lead Ads to Zapier
2. Zapier is configured with MySQL action → inserts leads into a campaign table
3. CRMPusher polls the table every 30 seconds and forwards new leads to RichardCRM via API key
4. Forwarding status (pending / forwarded / failed) is tracked per lead

---

## Setup

### 1. Configure the backend

Edit `backend/.env`:

```env
PORT=3001

DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=your-mysql-user
DB_PASSWORD=your-mysql-password
DB_NAME=crmpusher

JWT_SECRET=some-long-random-string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin123!

POLL_INTERVAL_SECONDS=30
```

### 2. Initialize the database

```bash
cd backend
npm run setup
```

This creates the database, tables, and admin user.

### 3. Start the backend

```bash
cd backend
npm run dev       # development
npm start         # production
```

### 4. Start the frontend

```bash
cd frontend
npm run dev       # development (runs on http://localhost:3000)
npm run build     # production build
```

---

## Admin Panel

Open `http://localhost:3000` and log in with your admin credentials.

### Creating a Campaign

1. Click **New Campaign**
2. Enter:
   - **Campaign Name** — e.g. "Campaign 1 - EU Leads"
   - **CRM API URL** — base URL of RichardCRM (e.g. `https://crm.yourdomain.com`)
   - **CRM Affiliate API Key** — the API key from RichardCRM Settings → API Keys
3. Click **Create Campaign**

A MySQL table is automatically created for this campaign (e.g. `leads_campaign_1`).

### Giving Zapier Details to the Affiliator

Open the campaign and scroll to the **Zapier MySQL Connection Details** section. Copy:
- Host, Port, Database, Username, Password → MySQL connection in Zapier
- Table Name → the table Zapier will insert rows into

### Zapier Setup (for affiliator)

1. In Zapier, create a new Zap
2. Trigger: **Facebook Lead Ads → New Lead**
3. Action: **MySQL → Create Row**
4. Connection: use the MySQL details from the campaign page
5. Table: use the table name shown in the campaign page
6. Map fields:
   - First Name → `first_name`
   - Last Name → `last_name`
   - Email → `email`
   - Phone → `phone`
   - Country → `country` (if available)
   - City → `city` (if available)

---

## Lead Table Schema

Each campaign gets its own MySQL table with these columns:

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Auto-increment primary key |
| `first_name` | VARCHAR | Lead first name (set by Zapier) |
| `last_name` | VARCHAR | Lead last name (set by Zapier) |
| `email` | VARCHAR | Lead email (set by Zapier) |
| `phone` | VARCHAR | Lead phone (set by Zapier) |
| `country` | VARCHAR | Lead country (set by Zapier) |
| `city` | VARCHAR | Lead city (set by Zapier) |
| `forward_status` | ENUM | `pending` / `forwarded` / `failed` |
| `forwarded_at` | DATETIME | When it was forwarded to CRM |
| `crm_lead_id` | VARCHAR | The ID returned by RichardCRM |
| `forward_error` | TEXT | Error message if forwarding failed |
| `retry_count` | INT | Number of retry attempts |
| `created_at` | TIMESTAMP | When Zapier inserted the row |

---

## Project Structure

```
CRMPusher/
├── backend/
│   ├── config/          database + environment config
│   ├── controllers/     request handlers
│   ├── middleware/       JWT auth middleware
│   ├── routes/          Express routes
│   ├── services/        business logic + lead poller
│   ├── setup.js         one-time DB initialization
│   └── server.js        entry point
└── frontend/
    └── src/
        ├── api/         axios client
        ├── components/  Layout, Modal, PrivateRoute
        ├── context/     AuthContext
        └── pages/       Login, Campaigns, CampaignDetail
```
