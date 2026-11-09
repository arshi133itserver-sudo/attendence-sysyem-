# Arshi Enterprises – Smart RFID Employee Attendance Management System

A production-ready, full-stack, enterprise-grade RFID Employee Attendance Management System built for **Arshi Enterprises**.

---

## 🌟 Key Features

### 1. Technology Stack
- **Frontend**: React.js (Vite) + Tailwind CSS + Lucide Icons + Recharts + jsPDF + XLSX
- **Backend**: Node.js + Express.js + Mongoose (MongoDB Atlas / Local MongoDB)
- **Hardware Integration**: ESP32 DevKit v1 + RC522 (13.56 MHz RFID Reader) + I2C LCD + Buzzer + LEDs
- **Security**: JWT Authentication + Role-Based Access Control (Admin & Staff) + Hardware API Key (`X-API-KEY`)
- **Offline Reliability**: LittleFS / SPIFFS offline scan caching on ESP32 with automatic batch synchronization when reconnected.

---

### 2. Employee Management
- Unlimited employee registration with auto-generated Employee IDs (`ARS-001`, `ARS-002`, etc.).
- Complete profiles: Full Name, Email, Mobile Number, Department, Designation, Joining Date, Salary, and Profile Photo.
- 1-to-1 unique RFID Card UID assignment (`Mifare Classic 1K`).
- Duplicate card prevention and admin workflow for lost/damaged card deactivation and reassignment.
- Live search, department filtering, status toggling (Active/Inactive), and record archival.

---

### 3. Smart RFID Attendance Engine
- **First Valid Tap** = Clock **IN**.
- **Next Valid Tap** = Clock **OUT**.
- **Subsequent Taps** = New Sessions (Supports multiple IN/OUT sessions per day with automatic break duration computation).
- **Anti-Passback / Debounce Cooldown**: Prevents accidental double scans within a configurable interval (default: 60s).
- **Accurate Working Hours**: Calculates total net working minutes across all closed sessions without double-counting breaks.
- **Late Arrival & Early Departure Detection**: Compares against office start time (e.g. 09:00 AM) + grace period (e.g. 15 mins).
- **Missed Checkout & Manual Corrections**: Admin correction workflow with mandatory audit reason logging.

---

### 4. Admin Dashboard
- **8 Real-time KPI Cards**: Total Employees, Present Today, Absent Today, Currently Working, Late Arrivals, Early Departures, Total Working Hours Today, Monthly Attendance Percentage.
- **Visual Analytics**:
  - 7-Day Weekly Attendance Trend (Present, Late, Absent) via Recharts.
  - Department Attendance Distribution and compliance bars.
  - Top Employee Working-Hours comparison.
  - Live check-in feed with real-time status indicators.
- **Interactive Web RFID Simulator**: Test card taps with authentic synthesized buzzer tones, virtual OLED display, and status LEDs directly inside your browser!

---

### 5. Date-Wise & Monthly Reports
- **Date-Wise Attendance**: Query any date with department and employee search filters. Displays IN, OUT, Total Hours, Breaks, Late/Early flags.
- **Employee Monthly Timesheet**: Day-by-day punch breakdown, total working days, present, absent, half days, late arrivals, overtime, and monthly attendance percentage.
- **Export Formats**: One-click export to **Excel (.xlsx)** and branded **PDF (.pdf)** documents.

---

### 6. Role-Based Access
| Feature | Administrator (`admin@arshi.com`) | Staff Employee (`rahul@arshi.com`) |
| :--- | :---: | :---: |
| Admin Dashboard & Analytics | ✅ | ❌ |
| Manage Employees & RFID Cards | ✅ | ❌ |
| Manual Punch & Session Correction | ✅ | ❌ |
| System & Shift Configuration | ✅ | ❌ |
| View All Attendance & Reports | ✅ | ❌ |
| View Personal Attendance Timesheet | ✅ | ✅ |
| Export Personal / Company Reports | ✅ | ✅ (Own) |
| Web RFID Simulator Access | ✅ | ✅ |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ or v22+
- **MongoDB** (Local `mongod` on port 27017 or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) Cluster URI)

---

### 2. Backend Setup
```bash
# 1. Navigate to the server folder
cd server

# 2. Install dependencies
npm install

# 3. Configure environment variables (.env)
# Create or edit server/.env:
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/arshi_attendance
# (For MongoDB Atlas, use: mongodb+srv://<user>:<password>@cluster0.mongodb.net/arshi_attendance)
JWT_SECRET=arshi_jwt_secret_key_2026_super_secure_production
RFID_API_KEY=ARSHI_RFID_SECRET_KEY_2026
NODE_ENV=development

# 4. Seed database with initial settings, 8 employees, and 14 days of realistic attendance
npm run seed

# 5. Start the server
npm start
# Server runs on: http://localhost:5000
```

---

### 3. Frontend Setup
```bash
# 1. Open a new terminal and navigate to client
cd client

# 2. Install dependencies
npm install

# 3. Start Vite development server
npm run dev
# Frontend runs on: http://localhost:5173
```

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@arshi.com` | `adminpassword123` | Full control, employee management, settings |
| **Staff Member** | `rahul@arshi.com` | `staffpassword123` | Personal timesheet, attendance history, monthly stats |

> **Tip**: The login screen features 1-click quick fill buttons for instant testing.

---

## 📡 REST API Reference

### Hardware Endpoints (ESP32 Integration)
| Method | Endpoint | Headers | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/rfid/scan` | `X-API-KEY: <key>` | Transmit RFID Card UID on tap |
| `POST` | `/api/rfid/sync-offline` | `X-API-KEY: <key>` | Batch synchronize cached offline scans |
| `GET`  | `/api/health` | None | Server health check and database status |

#### Sample Scan Request:
```json
POST /api/rfid/scan
Headers:
  Content-Type: application/json
  X-API-KEY: ARSHI_RFID_SECRET_KEY_2026

Body:
{
  "cardUid": "73A2B19F",
  "deviceId": "ESP32_FRONT_GATE_01"
}
```

#### Sample Clock IN Response:
```json
{
  "success": true,
  "status": "SUCCESS",
  "scanType": "IN",
  "message": "Welcome Rahul Sharma! Clocked IN at 09:05 AM.",
  "employee": {
    "id": "ARS-001",
    "name": "Rahul Sharma",
    "department": "Engineering",
    "designation": "Lead Embedded & Software Engineer"
  },
  "time": "09:05 AM",
  "date": "2026-11-04",
  "buzzer": { "beeps": 1, "durationMs": 200 }
}
```

#### Sample Clock OUT Response:
```json
{
  "success": true,
  "status": "SUCCESS",
  "scanType": "OUT",
  "message": "Goodbye Rahul Sharma! Clocked OUT at 06:15 PM. (Today: 8h 10m)",
  "employee": {
    "id": "ARS-001",
    "name": "Rahul Sharma",
    "department": "Engineering"
  },
  "time": "06:15 PM",
  "date": "2026-11-04",
  "sessionDuration": "4h 15m",
  "totalWorkingHours": "8h 10m",
  "buzzer": { "beeps": 2, "durationMs": 150 }
}
```

---

### Application Endpoints (JWT Bearer Token Required)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Login user, returns JWT and user profile |
| `GET`  | `/api/employees` | List employees with search and department filter |
| `POST` | `/api/employees` | Register new employee and assign RFID card |
| `PUT`  | `/api/employees/:id` | Update employee details or reassign card |
| `DELETE`| `/api/employees/:id` | Archive employee and release card |
| `GET`  | `/api/attendance/today` | Real-time attendance list for today |
| `GET`  | `/api/attendance/date` | Query attendance by date |
| `POST` | `/api/attendance/manual` | Record manual IN/OUT on behalf of employee |
| `POST` | `/api/attendance/correct`| Admin correction for missed checkout with audit reason |
| `GET`  | `/api/dashboard/stats` | Aggregated dashboard KPIs and chart data |
| `GET`  | `/api/reports/date-wise` | Date-wise report with export attributes |
| `GET`  | `/api/reports/monthly` | Monthly employee timesheet and summary |
| `GET`  | `/api/settings` | Get company settings, holidays, and departments |
| `PUT`  | `/api/settings` | Update shifts, grace periods, and API keys |

---

## 🔌 Hardware Circuit & Pinout

Refer to [hardware/WIRING_DIAGRAM.md](file:///d:/arshi%20enterprises%20attendence%20system/hardware/WIRING_DIAGRAM.md) for full schematics and [hardware/TESTING_GUIDE.md](file:///d:/arshi%20enterprises%20attendence%20system/hardware/TESTING_GUIDE.md) for step-by-step flashing instructions.

### Quick Connection Summary:
- **RC522 3.3V** -> **ESP32 3V3** (⚠️ Never 5V!)
- **RC522 GND** -> **ESP32 GND**
- **RC522 RST** -> **GPIO 22**
- **RC522 SDA(SS)** -> **GPIO 5**
- **RC522 SCK** -> **GPIO 18**
- **RC522 MOSI** -> **GPIO 23**
- **RC522 MISO** -> **GPIO 19**
- **LCD SDA / SCL** -> **GPIO 21 / GPIO 22**
- **Green LED (IN)** -> **GPIO 2**
- **Blue LED (OUT)** -> **GPIO 15**
- **Red LED (Reject)** -> **GPIO 13**
- **Buzzer (+)** -> **GPIO 4**

---

## 🏢 Company
**Arshi Enterprises**  
*Next-Generation Smart Attendance & IoT Workplace Solutions*
