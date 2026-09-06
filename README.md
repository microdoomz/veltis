# Veltis — The Modern Sovereign Wealth & Financial Operating System

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle%20ORM-0.45-green?style=flat&logo=drizzle)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20Serverless-blue?style=flat&logo=postgresql)](https://neon.tech/)
[![Better Auth](https://img.shields.io/badge/Better%20Auth-1.7-purple?style=flat)](https://better-auth.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)

> **Veltis** is an enterprise-grade, privacy-first personal wealth operating system. Engineered on an immutable double-entry ledger, Veltis unifies liquid banking, live investment portfolios, liabilities, receivables, automated iOS Shortcuts capture, and bank statement intelligence into a high-performance, offline-capable dashboard.

---

## 🌟 Executive Overview

Traditional personal finance apps rely on brittle single-entry tracking, closed proprietary syncing, and intrusive third-party data aggregators. **Veltis** re-engineers personal wealth management from first principles:

- **Mathematical Integrity**: Powered by a dual-leg double-entry ledger with integer minor-currency units (`cents`)—eliminating floating-point inaccuracies and balance drift.
- **Sovereignty & Security**: Native WebAuthn Passkeys (Face ID, Touch ID, Windows Hello), TOTP 2FA, single-use recovery codes, and strict workspace isolation.
- **Velocity**: Instant transaction capture via Siri & Apple iOS Shortcuts in under 200 milliseconds.
- **Privacy Mode**: One-click instant masking of all monetary balances across the interface for secure public browsing.
- **Resilient Offline Architecture**: IndexedDB caching with progressive web app (PWA) background sync.

---

## 🚀 Key Features

### 1. 💼 Double-Entry Ledger Core & Account Hierarchy
- **Zero Mathematical Drift**: Every transaction records balanced debit and credit legs.
- **Multi-Account Topology**: Support for Savings, Checking, Cash Wallets, Credit Cards, Investment Brokerages, and Liabilities.
- **Real-Time Wealth Equations**:
  - **Total Net Worth**: $\sum (\text{Assets}) - \sum (\text{Liabilities})$
  - **Liquid Balance**: Total Wealth minus Total Investments.
  - **Available to Spend**: Liquid Balance minus active Liens, Reserved Allocations, and Funds Held for Others.
- **Recent Activity Stream**: Live view of the latest 10 transactions per account with 1-click navigation into detailed ledger history.

### 2. 📱 Apple iOS Shortcuts & Instant Siri Capture
- **Sub-second Logging**: Log expenses or income in seconds directly from the iPhone Lock Screen, Action Button, or Siri without launching the web application.
- **Pre-Configured Shortcut**: Ready-to-use downloadable `.shortcut` package that self-configures via secure Bearer API tokens.
- **Smart Taxonomy & Multi-Account Parsing**: Automates merchant tagging, category classification, and account routing via dedicated shortcut endpoints (`/api/shortcuts/expense` and `/api/shortcuts/income`).
- **Token Security**: Generate and revoke scoped API keys with independent permissions per user.

### 3. 📈 Multi-Asset Investment Portfolio Tracker
- **Real-time Valuation**: Live market price feeds for stocks, ETFs, mutual funds, and cryptocurrencies powered by Yahoo Finance integrations.
- **Performance Analytics**: Real-time computation of average cost basis, realized gains, unrealized P&L, day change %, and allocation weightings.
- **Top-Up & Buy/Sell Workflows**: Settle trades directly against linked bank or cash accounts in a single atomic transaction.

### 4. 📄 Bank Statement & PDF Import Engine
- **Cross-Format Support**: Ingest bank statements via PDF, CSV, or XLSX/Excel files.
- **Serverless-Safe PDF Parsing**: Pure JavaScript/ESM document extraction engineered with `unpdf`—eliminating native canvas/DOM worker crashes in serverless Vercel environments.
- **Auto-Mapping & De-duplication**: Intelligent column detection for Dates, Descriptions, Reference IDs, Debits, and Credits with preview, batch staging, and one-click ledger commit.

### 5. 🛡️ Enterprise Security, 2FA & Passkeys
- **Unified 2FA Hub**: One master security switch managing independent modular verification layers:
  - **Hardware Biometrics (Passkeys / WebAuthn)**: Instant authentication via fingerprint or facial recognition stored in device Secure Enclaves.
  - **Authenticator Apps (TOTP)**: Standard 6-digit codes compatible with Google Authenticator, 1Password, and Apple Passwords.
  - **Backup Recovery Codes**: Secure, offline single-use emergency bypass codes.
- **Enforced 2FA Gate**: Hardened authentication barrier on sign-in that mandates secondary verification before establishing a session.
- **Account Self-Destruction (GDPR Right to be Forgotten)**: Dual-step confirmation modal requiring typing `DELETE` to permanently scrub all user data, workspaces, ledger entries, and credentials from the database.

### 6. 📊 Predictive Budgets & Envelope Allocation
- **Dynamic Envelope Budgeting**: Allocate funds across custom categories with real-time spend progress indicators.
- **Rollover & Overspend Safeguards**: Configure soft warnings and hard budget thresholds.
- **Scheduled & Recurring Subscriptions**: Automated detection of recurring bills, utility obligations, and subscriptions with daily cron execution and status notifications.

### 7. 🤝 Receivables & Liabilities (Debt Management)
- **Debt Payoff Engine**: Track credit card balances, personal loans, and mortgages with interest rates, minimum due dates, and amortization tracking.
- **IOU & Receivable Management**: Record loans to colleagues, family, or friends with partial settlements and maturity tracking.

### 8. 🌐 Offline-First PWA & Privacy Controls
- **IndexedDB Replay Queue**: Continue logging transactions even when completely disconnected from the internet; queues sync actions and automatically commits when connectivity resumes.
- **Privacy Shield**: Global eye toggle instantly obfuscates all currency amounts with sleek blur filters.
- **Multi-Format Financial Exports**: Generate investor-grade PDF statements (via `pdfmake`), Excel spreadsheets (via `exceljs`), and raw CSV exports.

---

## 🛠️ Architecture & Tech Stack

```mermaid
graph TD
    Client["Client Devices (Browser, PWA, iOS Shortcuts)"] --> CDN["Vercel Edge Network / CDN"]
    CDN --> NextApp["Next.js 16.3 (Turbopack, App Router)"]
    
    subgraph Core Engine
        NextApp --> BetterAuth["Better Auth 1.7 (Sessions, TOTP, WebAuthn)"]
        NextApp --> Ledger["Double-Entry Ledger Engine (Atomic SQL)"]
        NextApp --> StatementParser["Universal Statement Ingestion (unpdf, exceljs)"]
        NextApp --> MarketService["Market Data Aggregator (Yahoo Finance)"]
    end
    
    subgraph Persistence Layer
        Ledger --> Drizzle["Drizzle ORM 0.45"]
        Drizzle --> Neon["Neon Serverless PostgreSQL (WebSocket Pooler)"]
    end
```

| Layer | Technologies | Highlights |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.3.3, React 19.2.8 | Turbopack, App Router, React Server Components (RSC) |
| **Language** | TypeScript 5 | Strict typing, end-to-end schema validation with Zod 4.5 |
| **Styling & UI** | Tailwind CSS v4, Framer Motion, Lucide Icons | Custom modern dark glassmorphism, responsive micro-animations |
| **Database** | PostgreSQL on Neon Serverless | WebSocket connection pooling (`@neondatabase/serverless`) |
| **ORM** | Drizzle ORM 0.45.2, Drizzle Kit | Type-safe migrations, zero-overhead SQL generation |
| **Authentication** | Better Auth 1.7.2 | WebAuthn Passkeys, TOTP 2FA, Magic Links, Social OAuth, Sessions |
| **Data Parsing** | unpdf, ExcelJS | Serverless-compatible, zero-native-dependency document extraction |
| **Visualizations** | Recharts 3.10 | Interactive area charts, breakdown rings, and budget progression bars |
| **PWA & Offline** | Service Workers, IndexedDB (`idb`) | Background offline sync queue, cross-device installation |

---

## 📁 Repository Structure

```
veltis/
├── public/                       # Static public assets, PWA manifests, icons
│   ├── shortcuts/                # Pre-configured Veltis.shortcut package
│   ├── manifest.json             # PWA Web App Manifest
│   └── sw.js                     # Service worker caching and offline handler
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (app)/                # Authenticated application routes
│   │   │   ├── accounts/         # Accounts list, detail, and reconciliation
│   │   │   ├── analytics/        # Comprehensive cashflow and net worth metrics
│   │   │   ├── budgets/          # Category-based envelope budgeting
│   │   │   ├── exports/          # PDF, Excel, and CSV export center
│   │   │   ├── home/             # Executive dashboard and wealth overview
│   │   │   ├── imports/          # Bank statement upload, review, and commit
│   │   │   ├── investments/      # Holdings, portfolio analytics, trade top-up
│   │   │   ├── liabilities/      # Debt snowball and liability tracking
│   │   │   ├── receivables/      # IOUs and peer receivable tracking
│   │   │   ├── recurring/        # Subscription and recurring bill scheduling
│   │   │   ├── settings/         # Profile, security, 2FA, taxonomy & account purge
│   │   │   ├── shortcuts/        # iOS Shortcut token generator & guides
│   │   │   └── transactions/     # Filterable ledger, manual transaction entry
│   │   ├── (auth)/               # Unauthenticated login, register, 2FA challenge
│   │   └── api/                  # RESTful API endpoints and cron webhooks
│   ├── components/               # Modular UI components
│   │   ├── accounts/             # Account cards, allocations modal, actions
│   │   ├── analytics/            # Recharts dashboards and visual breakdown
│   │   ├── auth/                 # Login, multi-method 2FA challenge, signup
│   │   ├── imports/              # Drag-and-drop parsers, staging table
│   │   ├── investments/          # Stock quote search, trade execution
│   │   ├── layout/               # Sidebar, header, privacy eye toggle, refresh
│   │   └── settings/             # 2FA configuration, passkeys, account deletion
│   └── lib/                      # Core business logic & database services
│       ├── auth/                 # Better Auth server configuration and client SDK
│       ├── db/                   # Drizzle schema (37 domain tables) & migrations
│       ├── ledger/               # Double-entry ledger queries, balance calculations
│       ├── money/                # Currency conversion, minor-unit formatting
│       └── services/             # Idempotency, transaction posting, statement parsing
├── .gitignore                    # Production git exclusion patterns
├── drizzle.config.ts             # Drizzle Kit CLI configuration
├── next.config.ts                # Turbopack and Next.js compiler settings
└── package.json                  # Application metadata and dependency tree
```

---

## ⚙️ Getting Started

### Prerequisites
- **Node.js**: v20.x or later
- **npm**, **pnpm**, or **bun**
- **PostgreSQL Database**: Recommended [Neon Serverless Postgres](https://neon.tech)

### 1. Clone the Repository
```bash
git clone https://github.com/microdoomz/veltis.git
cd veltis
```

### 2. Configure Environment Variables
Create a `.env.local` file in the project root:

```env
# Database (Neon Serverless PostgreSQL connection string)
DATABASE_URL="postgresql://user:password@ep-sample-pooler.region.aws.neon.tech/veltis?sslmode=require"

# Base Application URL
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Better Auth Secret (Generate via `openssl rand -base64 32`)
BETTER_AUTH_SECRET="your-super-secret-key-at-least-32-characters"

# Optional Email Service (Resend)
RESEND_API_KEY="re_123456789"
EMAIL_FROM="noreply@veltis.app"

# Optional SMS Provider (Twilio)
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""
```

### 3. Install Dependencies & Migrate Database
```bash
npm install
npm run migrate:prod
```

### 4. Launch the Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Security & Data Sovereignty

- **Row-Level Tenant Isolation**: All ledger entries, accounts, tags, and imports are partitioned by `workspaceId` and scoped to the verified session user.
- **Hardware-Enforced Cryptography**: Passkeys utilize FIDO2/WebAuthn public-key cryptography stored exclusively within hardware enclaves.
- **Replay Protection & Idempotency**: All transaction write endpoints enforce client-supplied idempotency keys to prevent duplicate posting.
- **GDPR Account Obliteration**: Deleting an account initiates a foreign-key ordered cascade that strips every user artifact from the database.

---

## 📄 License

Veltis is private, proprietary software. All rights reserved.
