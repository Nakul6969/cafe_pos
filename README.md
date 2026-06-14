# ☕ Cafe Odoo | Smart Cafe & Point of Sale Management System

Cafe Odoo is a premium, modern, and real-time Cafe Point of Sale (POS) and Kitchen Display System (KDS). Designed for high-efficiency cafe operations, it integrates cashier workflows, real-time kitchen monitors, customer relationship management, and live payment processing.

---

## 🚀 Key Features

### 💻 Cashier POS Terminal
*   **Menu Catalog & Cart**: Clean, responsive grids to browse categories, search items, customize modifiers, and apply discounts/coupons.
*   **Live Order Status Tracker**: A real-time updating list for cashiers to monitor exactly where an order is in the kitchen workflow (To Cook ➜ Preparing ➜ Completed) and track payment statuses.
*   **Voucher & Promotion Engines**: Supports fixed/percentage coupon discounts and automatic basket promotions.
*   **Multi-Device Real-Time Sync**: Driven by Server-Sent Events (SSE) to sync orders, table updates, and session changes instantly across all terminals.

### 🍳 Kitchen Display System (KDS)
*   **Interactive Columns**: Organizes tickets dynamically into *To Cook*, *Preparing*, and *Completed* queues.
*   **Real-Time sound buzzers**: Alerts the kitchen staff instantly when a new order is sent from the POS.
*   **Buzzer sound test alarm**: Easily test sound alarms on kitchen tablets.

### 💳 Integrated Payments (Razorpay)
*   **Dynamic QR Codes**: Generates live, unique Razorpay UPI/Card payment links dynamically per transaction.
*   **Auto-Detect Payment**: Automatically polls the transaction status on the backend, auto-approves the POS checkout, prints the receipt, and releases the table once the customer scans and pays.
*   **Secure Signature Verification**: Uses secure HMAC-SHA256 signature hashing to verify the authenticity of all payments on the backend.

### 🎙️ AI Voice-Guided Orders
*   **Gemini AI Integration**: Cashiers can simulate voice-guided order taking (e.g., *"Add three Iced Lavender Lattes and one Smashed Avocado Toast please"*). Powered by Google Gemini API, it parses the voice command and automatically populates the POS cart.

---

## 🛠️ Tech Stack

*   **Frontend**: React (v19), TypeScript, Vite, TailwindCSS, Lucide Icons, Recharts.
*   **Backend**: Node.js, Express, SSE (Server-Sent Events) for real-time channels.
*   **Database**: PostgreSQL, Prisma ORM.
*   **Payments**: Razorpay SDK.
*   **AI Engine**: Google `@google/genai` (Gemini API).

---

## 📂 Project Structure

This project is configured as a Monorepo using npm workspaces:
```text
odoo-cafe-pos-monorepo/
├── backend/            # Express Server, Prisma Schema, Seeding & API Endpoints
│   ├── prisma/         # Prisma schema and PostgreSQL migrations
│   └── src/            # Express, SSE, and Razorpay controllers
├── frontend/           # React + Vite Client Application
│   ├── public/         # Static assets and logo images
│   └── src/            # Components (POS Terminal, KDS, Admin Panel)
├── package.json        # Workspace orchestrator script configurations
└── README.md
```

---

## 💻 Local Setup & Installation

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v18+)
*   [PostgreSQL](https://www.postgresql.org/) (or use Docker to run a local instance)

### 2. Clone the Repository
```bash
git clone https://github.com/Nakul6969/cafe_pos.git
cd cafe_pos
```

### 3. Install Workspace Dependencies
Run this in the root directory to install packages for both frontend and backend:
```bash
npm install
```

### 4. Database Setup & Seeding
Create a `.env` file inside the `backend` directory:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/cafeodoo?schema=public"
JWT_SECRET="your-local-super-secret-key-12345"
GEMINI_API_KEY="YOUR_GEMINI_API_KEY" # Optional
```

Run migrations and seed the default catalog:
```bash
# Generate Prisma Client
npm run prisma:generate --workspace=backend

# Push schema to local DB
npx prisma db push --schema=backend/prisma/schema.prisma

# Seed default admin user and cafe products
npm run prisma:seed --workspace=backend
```

### 5. Running the Application
Run both the frontend and backend concurrently in development mode:
```bash
npm run dev
```
*   **POS Terminal / Cashier Portal**: `http://localhost:5173` (Login: `admin@cafeflow.com` / `admin123`)
*   **Backend Engine**: `http://localhost:3000`

---

## ☁️ Deployment Guide (Render.com)

In production, the backend is configured to **automatically serve the built frontend assets** (`dist` directory). You only need to deploy **one** Node Web Service and **one** PostgreSQL Database on Render.

### 1. Create a PostgreSQL Database on Render
*   Select the **Free** tier.
*   Copy the **Internal Database URL** once it is created.

### 2. Create a Web Service on Render
*   Connect your GitHub repository.
*   Configure the following settings:
    *   **Build Command**: `npm install --production=false && npm run prisma:generate --workspace=backend && npm run build`
    *   **Start Command**: `cd backend && npx prisma db push --accept-data-loss && npx prisma db seed && cd .. && npm run start`
    *   **Instance Type**: `Free`

### 3. Configure Environment Variables on Render
Add the following keys under **Environment**:
*   `NODE_ENV`: `production`
*   `DATABASE_URL`: *[Paste Internal Database URL]*
*   `JWT_SECRET`: *[Random secure string]*
*   `RAZORPAY_KEY_ID`: *[Your Razorpay Key ID]*
*   `RAZORPAY_KEY_SECRET`: *[Your Razorpay Key Secret]*
*   `GEMINI_API_KEY`: *[Your Google Gemini API Key]* (optional)

---

## 💳 Razorpay Webhook Configuration (Optional)
To verify payments asynchronously, point your Razorpay Webhook endpoint on the Razorpay Dashboard to:
`https://your-app-name.onrender.com/api/payment/verify`
Select the event: `payment.captured`.

---

## 🔒 Default Login Credentials (After Seeding)
*   **Admin / Cashier**: `admin@cafeflow.com` / `admin123`
*   **Kitchen Chef**: `chef@cafeflow.com` / `chef123`
*   **Employee**: `employee@cafeflow.com` / `employee123`
