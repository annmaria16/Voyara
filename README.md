# VOYARA — Accommodation & Experience Booking Platform

> **"Find Your Place."**  
> *Stay. Explore. Experience.*

Voyara is a complete, production-grade accommodation and curated experience booking platform. It seamlessly connects travelers discovering extraordinary stays (Hotels, Homestays, Resorts, Camps, Cottages, and Villas) with verified hosts offering authentic regional adventures (Guided Treks, Campfire Nights, Spice Trails, Sea Kayaking, and Cultural Gatherings).

At the core of Voyara is **VeriNova**, an internal transaction and inventory verification layer that enforces database consistency, guarantees capacity arithmetic, prevents double bookings, and maintains an immutable audit trail for every confirmed reservation.

---

## 🌟 Key Highlights & Role Hierarchy

Voyara features a strictly **Sidebar-First** layout for authenticated portals and three distinct user roles:

1. **Traveler / Customer (`CUSTOMER`)**:
   - **Live PostgreSQL Discovery**: Multi-criteria search across destinations, date ranges, guest counts, property types, price filters, and experience keywords.
   - **Combined Checkout Flow**: Real-time room availability, add-on experience selection, server-side price calculations, and VeriNova consistency checks.
   - **Trip Ledger**: Manage active, upcoming, and completed reservations with live status badges and cancellation controls.
   - **Support & Help Desk**: Create support tickets with categories (`Booking Inquiry`, `Stay Experience`, `Payment / Verification`, `Host Listing Help`), track status, and read admin replies.
   - **Profile & Account Center**: View authenticated identity, contact details, and account status.

2. **Property Host / Provider (`PROVIDER`)**:
   - **Host Command Center**: Live metrics for active properties, managed room units, connected experiences, total reservations, and gross confirmed earnings.
   - **Property Management**: Full CRUD with local multi-image file uploading (`POST /api/upload/image`), strict property classifications (`Hotel`, `Homestay`, `Resort`, `Camp`, `Cottage`, `Villa`), location coordinates, and amenities.
   - **Rooms & Inventory**: Manage room capacities, bed types, nightly pricing, inventory counts, and photos.
   - **Live Availability Calendar**: Set whole-property seasonal closures and room-level blackout dates to prevent scheduling conflicts.
   - **Experience & Activity Management**: Create curated activities with max participant capacities, duration, and per-person rates.
   - **Guest Booking Ledger**: Monitor customer reservations and check-in schedules in real time.

3. **Platform Administrator (`ADMIN`)**:
   - **System Dashboard**: Live PostgreSQL aggregate metrics for total registered accounts, host distribution, active listings, inventory volume, total platform revenue, and VeriNova verification rate.
   - **Account Management**: Moderate user permissions, inspect host credentials, and toggle account statuses.
   - **Property & Inventory Oversight**: Audit all listings and room inventories across the platform.
   - **VeriNova Verification Center**: Inspect transaction integrity scores, itemized audit check results, and trigger automated database validation scans.
   - **Support Ticket Resolution**: Review guest and host support inquiries, submit responses, and resolve tickets.

---

## 🎨 Design System: Sunset Coast & Theme Support

Voyara features the curated **Sunset Coast** color palette with full **Light Mode** and **Dark Mode** support:

- **Deep Ocean (`#102A43`)**: Dark mode background canvas, primary headings, authenticated sidebar navigation.
- **Ocean Teal (`#147D92`)**: Primary interactive buttons, badges, and focus rings.
- **Turquoise (`#4FD1C5`)**: Active menu states, metric indicators, and VeriNova verification badges.
- **Sunset Coral (`#F97360`)**: Primary brand call-to-action buttons, pricing highlights, and status pills.
- **Peach (`#FDBA9A`)**: Subtle card borders, warm gradient accents, and secondary text highlights.
- **Warm Cream (`#FFF8F0`)**: Light mode canvas background and soft card containers.
- **Pure White (`#FFFFFF`)**: Light mode card background and crisp text contrast.

### Theme Switching
- Switch seamlessly between **Light Mode**, **Dark Mode**, and **System Preference**.
- The theme toggle is accessible directly inside the persistent authenticated **Sidebar** as well as in the public top utility bar.
- Theme preference is stored in `localStorage` and synchronized across all pages via `ThemeContext`.

---

## 🛡️ VeriNova Verification Engine

VeriNova performs automated, multi-point validation against the transactional database before and after every booking:

| Check Category | Verification Logic |
| :--- | :--- |
| **Property Validation** | Verifies property exists, is in `active` status, and has no active closure on requested dates. |
| **Room Inventory** | Confirms room belongs to property, is active, has no blackout dates, and has zero conflicting reservations. |
| **Experience Capacity** | Verifies experience belongs to property, is active, and remaining capacity (`booked + requested <= capacity`) is sufficient. |
| **Price Arithmetic** | Computes expected rate on the server (`nightly_rate × nights + experience_fee × participants`) and asserts zero discrepancy. |
| **Booking & Customer** | Validates date consistency (`check_out > check_in`), customer account existence, and guest limits. |

---

## 🛠️ Technology Stack

- **Backend**: Python 3.14, FastAPI, SQLAlchemy ORM, Pydantic v2, PyJWT, Passlib (Bcrypt), SQLite/PostgreSQL.
- **Frontend**: React 19 (Vite), JavaScript, Tailwind CSS v4, React Router v7, Axios, Lucide React, Chart.js / Recharts.
- **Storage & Uploads**: FastAPI StaticFiles mount at `/uploads` with instant preview and local multi-file upload support.
- **Authentication**: JWT Bearer Tokens with role-based route guards and Google Identity Services ready.

---

## 🚀 Getting Started

### 1. Start the Backend API

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run database seeder (seeds realistic demo stays, rooms, experiences, users, and support tickets)
python -m app.seed

# Start the FastAPI server on port 8000
uvicorn app.main:app --reload --port 8000
```

- **API Base URL**: `http://localhost:8000`
- **Interactive Swagger Documentation**: `http://localhost:8000/docs`

---

### 2. Start the Frontend Application

```bash
# Navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start the Vite development server
npm run dev
```

- **Frontend Application**: `http://localhost:5173`

---

## 🔑 Pre-Configured Test Accounts

| Role | Email | Password | Direct Portal |
| :--- | :--- | :--- | :--- |
| **Traveler (Customer)** | `john.traveler@example.com` | `TravelerVoyara2026!` | `/customer` |
| **Host (Provider)** | `kerala.stays@voyara.com` | `HostVoyara2026!` | `/provider` |
| **Super Admin** | `adminvoyara@gmail.com` | `Admin@123` | `/admin` |

---

## 📱 OTP & SMS Provider Configuration

Voyara supports two distinct OTP operational modes:

### 1. Development & Automated Testing Mode (`OTP_PROVIDER=development`)
- **Default for local development and automated testing**.
- **Zero 2Factor SMS credits consumed**: Outbound carrier SMS requests are suppressed server-side.
- **Predictable Test OTP**: Standard development OTP code **`123456`** is enabled in development/test mode for seamless automated browser testing (Antigravity / Selenium / Pytest).
- **Production Guard**: The server refuses to start if `ENVIRONMENT=production` and `OTP_PROVIDER=development`.

```env
# backend/.env
ENVIRONMENT=development
OTP_PROVIDER=development
```

### 2. Live Production Mode (`OTP_PROVIDER=2factor`)
- Dispatches real SMS directly to the physical SIM card over the Indian carrier network via the 2Factor.in API.
- Fixed development OTPs (`123456`) are strictly rejected.

```env
# backend/.env
ENVIRONMENT=production
OTP_PROVIDER=2factor
TWOFACTOR_API_KEY=your_actual_2factor_api_key
```

---

## 📁 Repository Structure

```
voyara/
├── backend/
│   ├── app/
│   │   ├── models/           # SQLAlchemy ORM (User, Property, Room, Experience, Booking, SupportTicket, etc.)
│   │   ├── routers/          # FastAPI routes (auth, properties, rooms, experiences, bookings, support, upload)
│   │   ├── services/         # Business logic & VeriNova verification engine
│   │   ├── main.py           # FastAPI entrypoint, CORS, static file mounts
│   │   └── seed.py           # Comprehensive database seeder with realistic test data
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/              # Axios API service clients (auth, properties, bookings, support, upload)
│   │   ├── components/       # Reusable UI (Sidebar, Layout, Charts, Calendar, ImageUploadPicker, Logo)
│   │   ├── context/          # AuthContext (JWT/roles) & ThemeContext (Light/Dark)
│   │   ├── layouts/          # CustomerLayout, ProviderLayout, AdminLayout
│   │   ├── pages/            # Role pages (auth, customer, provider, admin, common)
│   │   ├── App.jsx           # Master route definition with role-based route protection
│   │   └── main.jsx
│   ├── public/               # Static assets & official Voyara logo (logo.png)
│   └── package.json
└── README.md
```

