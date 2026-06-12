# Catering Management System (Sri Sandilyasa Caterers - SSC)

A comprehensive, modern web-based management system for **Sri Sandilyasa Caterers (SSC)** designed to streamline food preparation services, daily subscription lunch packs, walk-in Curry Point POS sales, bulk orders, event catering contracts, worker attendance & payroll, inventory stock levels, and end-to-end expense tracking.

The system is built as a responsive Next.js web application utilizing Tailwind CSS v4, Prisma ORM, PostgreSQL database, and NextAuth authentication.

---

## Table of Contents

1. [System Flow Overview](#1-system-flow-overview)
2. [Database Schema & Entity Relationships](#2-database-schema--entity-relationships)
3. [Step-by-Step Business Workflows](#3-step-by-step-business-workflows)
   - [Lunch Pack Subscriptions & QR Scanning Flow](#lunch-pack-subscriptions--qr-scanning-flow)
   - [Catering Orders & Payment Installments Flow](#catering-orders--payment-installments-flow)
   - [Bulk Orders Lifecycle](#bulk-orders-lifecycle)
   - [Curry Point POS Walk-in Sales](#curry-point-pos-walk-in-sales)
   - [Worker Attendance & Payroll Mechanics](#worker-attendance--payroll-mechanics)
   - [Expense Management & Automated Syncing](#expense-management--automated-syncing)
   - [Inventory & Stock Transaction Flow](#inventory--stock-transaction-flow)
4. [Dashboard Analytics & Financial Reports](#4-dashboard-analytics--financial-reports)
5. [Architecture & Technology Stack](#5-architecture--technology-stack)
6. [Getting Started & Local Development Setup](#6-getting-started--local-development-setup)

---

## 1. System Flow Overview

Sri Sandilyasa Caterers (SSC) features multiple operational fronts that feed into a centralized financial ledger and inventory system.

```mermaid
graph TD
    %% Sales Channels
    A[Lunch Pack Subscribers] -->|Daily QR Scan| LP[Lunch Packs System]
    B[Event Organizers] -->|Book Venue/Date| CO[Catering Orders]
    C[Bulk Meal Orders] -->|Order Large Quantity| BO[Bulk Orders]
    D[Walk-in Customers] -->|Walk-in Purchase| CP[Curry Point POS]
    
    %% Transactions & Payments
    LP -->|Generate Bill & Payment Logs| PAY[Central Payment Ledger]
    CO -->|Track Advance & Installments| PAY
    BO -->|Track Advance & Final Cashflow| PAY
    CP -->|Instant Walk-in Cashflow| PAY
    
    %% Operational Expenses
    WORK[Worker Payroll & Shift Attendance] -->|Record Shift Wage & Overtime| WPAY[Worker Payouts]
    WPAY -->|Automated Sync| EXP[Central Expense Tracker]
    
    INV[Inventory & Kitchen Supplies] -->|Purchase Raw Ingredients| INVT[Inventory Transactions]
    INVT -->|Purchase Restock Sync| EXP
    INVT -->|Consumed for Meals| STOCK[Stock Deductions]
    
    EXP -->|Deduct from Revenue| REPT[Net Profit & Loss Reporting]
    PAY -->|Add to Revenue| REPT
    
    %% Dashboard Insights
    REPT -->|Aggregate Real-time Metrics| DASH[Admin Dashboard]
    STOCK -->|Low-Stock Warnings| DASH
```

---

## 2. Database Schema & Entity Relationships

The PostgreSQL database schema (managed via Prisma) maps out the relationships between customers, orders, menu items, payments, workers, attendance, expenses, and inventory.

```mermaid
erDiagram
    LUNCH_CUSTOMER ||--o{ DAILY_LUNCH_TRANSACTION : scans
    DAILY_LUNCH_TRANSACTION ||--o{ PAYMENT : logs
    CATERING_ORDER ||--o{ PAYMENT : logs
    BULK_ORDER ||--o{ PAYMENT : logs
    CURRY_POINT_ORDER ||--o{ PAYMENT : logs
    
    WORKER ||--o{ ATTENDANCE : logs
    WORKER ||--o{ PAYMENT : receives
    
    INVENTORY_ITEM ||--o{ INVENTORY_TRANSACTION : records
    INVENTORY_TRANSACTION ||--o{ EXPENSE : triggers
    PAYMENT ||--o{ EXPENSE : tracks
```

### Main Database Entities

*   **User (`User`)**: System user accounts (Administrators, Managers, Staff) with credentials, roles (`ADMIN`, `MANAGER`, `STAFF`), and access rights.
*   **LunchCustomer (`LunchCustomer`)**: Regular subscribers for daily lunches. Contains subscriber ID (e.g. `LP0001`), unique QR code, default lunch configuration (Single/Double pack, with/without rice), and active status.
*   **DailyLunchTransaction (`DailyLunchTransaction`)**: Records daily lunch collections. Linked to the customer, captures pack type, rice option, optional extra items (extras JSON), calculated total, and payment status (`PAID` or `PENDING`).
*   **BulkOrder (`BulkOrder`)**: Tracks large-quantity lunch box orders. Captures customer details, quantity, date, pack type, rice option, advance payments, and order status (`PENDING`, `COMPLETED`, `CANCELLED`).
*   **CateringOrder (`CateringOrder`)**: Manages events, venues, custom menu details (configured as a JSON array of menu items), guest counts, total pricing, advance deposits, remaining balance, event status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), and payment ledger status.
*   **MenuItem (`MenuItem`)**: Catalog of catering items, Curry Point portions, and daily lunch extras, with pricing and status.
*   **CurryPointOrder (`CurryPointOrder`)**: Walk-in sales at the Curry Point POS. Contains an array of items sold, total amount, and payment method.
*   **Worker (`Worker`)**: Staff database profiles (Cooks, Helpers, Servers, Cleaners, Drivers) with salary configurations (Monthly wage vs. Daily rate).
*   **Attendance (`Attendance`)**: Daily worker attendance logs. Tracks status (`PRESENT`, `HALF_DAY`, `ABSENT`, `OVERTIME`), overtime hours, and dynamically calculated daily shift wages.
*   **Expense (`Expense`)**: Central database of expenditures categorized under `VEGETABLES`, `GAS`, `ELECTRICITY`, `TRANSPORT`, `KITCHEN_SUPPLIES`, `SALARY`, or `MISCELLANEOUS`.
*   **InventoryItem (`InventoryItem`)**: Stock database of kitchen ingredients and raw supplies (Rice, Dal, Oil, Gas cylinders, Milk, Masala, etc.) with current stock levels and minimum stock thresholds.
*   **InventoryTransaction (`InventoryTransaction`)**: Records inventory flow (`PURCHASED`, `CONSUMED`, `ADJUSTED`) and quantities.
*   **Payment (`Payment`)**: Consolidated payment audit ledger. Captures amount, date, payment method (`CASH`, `UPI`, `CARD`), and references (`LUNCH_PACK`, `CATERING`, `BULK_ORDER`, `SALARY`).
*   **Setting (`Setting`)**: Key-value system configurations (e.g., base pack prices, add-on costs).

---

## 3. Step-by-Step Business Workflows

### Lunch Pack Subscriptions & QR Scanning Flow

The daily subscription plan manages regular lunch distributions efficiently using QR-code scanning and automated payment reconciliation.

```mermaid
sequenceDiagram
    participant Customer as Lunch Customer
    participant Scanner as QR Code Scanner
    participant DB as System Database
    participant Payment as Payment Handler

    Customer->>Scanner: Present QR Code (LP0001)
    Scanner->>DB: Fetch Customer Default Config (Single/Double, Rice Yes/No)
    Note over Scanner: Staff adjusts Extras (Sweet, Fry, Extra Curry)
    Scanner->>DB: Record DailyLunchTransaction
    
    alt Paid Instantly
        DB->>Payment: Create Payment Log (Reference: LUNCH_PACK)
        Payment-->>DB: Set Transaction Status to PAID
    else Account Checked / Postpaid
        DB-->>DB: Set Transaction Status to PENDING
    end
```

#### Detailed Operations:
1.  **Subscription Setup**: Administrators register a `LunchCustomer` and assign a unique code (e.g., `LP0001`). The system stores their default delivery parameters.
2.  **Daily Collection**: At checkout, the customer scans their QR code. The app automatically populates the order. Staff can optionally append extras (e.g. `Sweet Extra`, `Fry Extra`) from the `LUNCH_PACK_EXTRA` catalog.
3.  **Instant Payments**: If paid instantly, the transaction status is marked as `PAID` and a `Payment` record of type `LUNCH_PACK` is created.
4.  **Automatic Payment Reconciliation (Auto-Settlement)**:
    *   For customers billing at month-end, the administrator records a bulk payment using `recordLunchPayment`.
    *   The backend retrieves all outstanding transactions for that customer flagged as `PENDING` ordered by date (oldest first).
    *   It sequentially distributes the payment amount, updating each transaction's status to `PAID` as far as the logged payment covers the balances.
5.  **Monthly Invoicing**:
    *   The system compiles monthly invoices via `generateMonthlyInvoice` by aggregating all transactions, subtracting payments made, and generating the outstanding balance.

---

### Catering Orders & Payment Installments Flow

Events and marriages involve custom menus, guest counts, and structured billing layouts.

```mermaid
stateDiagram-v2
    [*] --> PENDING: Order Created (Advance Received)
    PENDING --> IN_PROGRESS: Prep & Event Execution Underway
    IN_PROGRESS --> COMPLETED: Event Finished
    PENDING --> CANCELLED: Event Terminated
    IN_PROGRESS --> CANCELLED: Event Terminated
    
    state payment_status {
        [*] --> PENDING_PAYMENT: No Advance / 0 Paid
        PENDING_PAYMENT --> PARTIALLY_PAID: Payments Logged < Total
        PARTIALLY_PAID --> FULLY_PAID: Payments Logged == Total
        PENDING_PAYMENT --> FULLY_PAID: Full Payment Received
    }
```

#### Detailed Operations:
1.  **Quotation & Booking**: Administrators create a `CateringOrder` with event dates, guest counts, setup locations, and a JSON object containing selected menu dishes.
2.  **Advance Logging**: Creating the order automatically calculates the initial payment status. If an advance is paid, a `Payment` of reference type `CATERING` is created, and the balance is logged.
3.  **Installments & Balance Closure**: Payments are logged incrementally via the `recordCateringPayment` action. Each transaction reduces the order's `balanceAmount`, creates a consolidated `Payment` entry, and recalculates the payment status (`PENDING` $\rightarrow$ `PARTIALLY_PAID` $\rightarrow$ `FULLY_PAID`).
4.  **Status Transitions**: Order status can be progressed manually from `PENDING` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED` depending on venue operations.

---

### Bulk Orders Lifecycle

Designed for single-day corporate lunches or group gatherings that require large-quantity meals:
*   **Order Creation**: Created with customer name, count, date, menu extras, advance, and total price. If advance is paid, a `Payment` log of type `BULK_ORDER` is generated.
*   **Balance Settling**: When the order is completed, the remaining amount is collected and the status is transitioned to `COMPLETED`, logging the payment and zeroing out the `balanceAmount`.

---

### Curry Point POS Walk-in Sales

Walk-in sales at the curry retail point represent instant retail operations:
1.  **Checkout Cart**: POS operators select items (e.g. `250g Curry`, `Sambar`, `Fry`) and select the payment method (`CASH`, `UPI`, `CARD`).
2.  **Instant Ledger Writing**: Creating the order automatically creates a matching `Payment` log referencing `CURRY_POINT`.
3.  **Stock Impact**: Raw materials are deducted from inventory manually or via stock adjustment based on weekly consumption estimates.

---

### Worker Attendance & Payroll Mechanics

Worker payroll coordinates attendance records, overtime hours, and salary calculations dynamically.

#### Wage & Overtime Formulas:
Wages are calculated dynamically based on worker salary types:

1.  **Daily Wage Workers (`DAILY_WAGE`)**:
    *   **Full Day (`PRESENT`)**: $Wage = DailyRate$
    *   **Half Day (`HALF_DAY`)**: $Wage = \frac{DailyRate}{2}$
    *   **Overtime (OT)**: Paid at **1.5x (time-and-a-half)** of the calculated hourly rate:
        $$Wage_{OT} = \left(\frac{DailyRate}{8}\right) \times OTHours \times 1.5$$
    *   **Total Daily Wage**: $Wage_{Total} = BaseWage + Wage_{OT}$

2.  **Monthly Salaried Workers (`MONTHLY`)**:
    *   The monthly salary is converted to a daily metric for daily profit-and-loss reports:
        *   **Full Day (`PRESENT`)**: $Wage = \frac{MonthlySalary}{30}$
        *   **Half Day (`HALF_DAY`)**: $Wage = \frac{MonthlySalary}{60}$
        *   **Overtime (OT)**: Paid at **1.5x** of the daily hourly rate:
            $$Wage_{OT} = \left(\frac{MonthlySalary}{30 \times 8}\right) \times OTHours \times 1.5$$

#### Payroll & P&L Sync:
*   Attendance records are logged daily on the Worker Payroll dashboard.
*   Monthly payroll runs via `getWorkerPayroll` which aggregates attendance records, overtime hours, and payments made.
*   **Automated Expense Syncing**: When worker salaries are paid out using `payWorkerSalary`, the system logs a `Payment` of reference type `SALARY`. It then **automatically creates an Expense record** categorized under `SALARY` with the worker's name as the vendor. This guarantees labor costs are reflected in the global Profit & Loss reports.

---

### Expense Management & Automated Syncing

The central expense ledger captures manual entries and auto-generated items:

1.  **Regular Expenses**: Logged manually by admins for operational items (vegetables, gas refills, transport, electricity, or miscellaneous bills).
2.  **Automated Inventory Restocks**: Recording an inventory transaction of type `PURCHASED` with an associated unit price automatically writes a corresponding `KITCHEN_SUPPLIES` expense to the database.
3.  **Automated Worker Payroll**: Logging a salary payout triggers a `SALARY` expense automatically, linking labor costs directly to the cash flow ledger.

---

### Inventory & Stock Transaction Flow

Maintains optimal stock levels for raw catering ingredients and cooking items:

1.  **Inventory Registration**: Items are registered with a name, unit (`kg`, `liter`, `cylinder`, `packet`), and a safety threshold (`minStockLevel`).
2.  **Purchase Transactions (`PURCHASED`)**: Increments the `currentStock` level. If a unit price is specified, the system logs a `KITCHEN_SUPPLIES` expense.
3.  **Consumption Transactions (`CONSUMED`)**: Decrements `currentStock` based on daily preparation outputs. The backend enforces that stock levels cannot go below zero.
4.  **Adjustment Transactions (`ADJUSTED`)**: Adjusts stock levels to align with physical stock checks.

---

## 4. Dashboard Analytics & Financial Reports

The dashboard aggregates data to present an accurate summary of catering operations:

*   **Real-time Metrics**:
    *   **Sales Today**: Sum of Curry POS sales + Lunch Pack transactions + Bulk orders logged today.
    *   **Expenses Today**: Aggregation of manual and automated expenses logged today.
    *   **Profit Today**: Sales Today $-$ Expenses Today.
    *   **Cash Flow Today**: Total cash, UPI, and card payments received today.
*   **Low Stock Alerts**: Displays warnings when items fall below their registered `minStockLevel`.
*   **P&L Range Queries**: The Reports page allows operators to select starting and ending dates to run comprehensive profit reports, exporting transaction logs directly to Excel (`.xlsx`) spreadsheets.

---

## 5. Architecture & Technology Stack

The application is structured as a monolithic web app utilizing modern web tools:

*   **Frontend & Routing**: Next.js 16 (App Router) utilizing TypeScript.
*   **Styling & Design System**: Tailwind CSS v4 featuring CSS-variable based color themes and custom UI card modules.
*   **Database Client**: Prisma ORM with PostgreSQL backend.
*   **Authentication**: NextAuth.js credentials provider to secure admin, manager, and staff views.
*   **Analytics & Visualizations**: Recharts for business performance charts.
*   **QR Scanner**: Web-based QR parsing using `html5-qrcode` integration.
*   **Data Export**: Excel spreadsheet generation using `xlsx`.

---

## 6. Getting Started & Local Development Setup

### Prerequisites
*   Node.js 18+
*   PostgreSQL database instance

### Installation
1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Set Environment Variables**:
    Create a `.env` file in the project root:
    ```env
    DATABASE_URL="postgresql://username:password@localhost:5432/ssc_db?schema=public"
    NEXTAUTH_SECRET="a_strong_secret_key_for_session_token_encryption"
    NEXTAUTH_URL="http://localhost:3000"
    ```
3.  **Apply Database Schema & Client**:
    ```bash
    npx prisma generate
    npx prisma migrate dev --name init
    ```
4.  **Seed Default System Config & Admin**:
    Runs the seed file to create settings, default menu items, mock customers, workers, and an admin user (`admin@ssc.com` / `admin123`):
    ```bash
    node prisma/seed.js
    ```
5.  **Run in Development Mode**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to access the dashboard.
