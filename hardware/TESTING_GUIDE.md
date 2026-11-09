# Hardware Testing & Integration Guide

This guide explains how to test the **Arshi Enterprises RFID Attendance System** both with physical ESP32 hardware and virtually via the built-in Web Simulator and REST API.

---

## 1. Testing Without Physical Hardware (Virtual Simulator)

You can test the entire workflow without physical hardware:

### Option A: Interactive Web Simulator (In Browser)
1. Open the dashboard at `http://localhost:5173`.
2. Click the **"Simulate RFID Tap"** button in the top navigation bar.
3. Click any employee card pill (e.g. `Rahul Sharma (73A2B19F)`).
4. Listen to the synthesized hardware buzzer beeps and observe the virtual LEDs:
   - **First Tap**: Green LED + 1 beep -> Clocked IN.
   - **Immediate Re-tap**: Red LED + 2 quick beeps -> Debounce Cooldown Alert.
   - **Later Tap**: Blue LED + 2 beeps -> Clocked OUT with calculated working hours.
   - **Unknown Card (e.g. `UNKNOWN99`)**: Red LED + 3 error buzzes -> Access Denied.

---

### Option B: Command Line (curl)
Test the REST API directly matching what the ESP32 sends:

```bash
# 1. Normal Scan (Clock IN or OUT)
curl -X POST http://localhost:5000/api/rfid/scan \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: ARSHI_RFID_SECRET_KEY_2026" \
  -d '{"cardUid":"73A2B19F","deviceId":"ESP32_GATE_01"}'

# 2. Test Anti-Duplicate Cooldown (Run immediately after first scan)
curl -X POST http://localhost:5000/api/rfid/scan \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: ARSHI_RFID_SECRET_KEY_2026" \
  -d '{"cardUid":"73A2B19F","deviceId":"ESP32_GATE_01"}'

# 3. Test Unknown Card
curl -X POST http://localhost:5000/api/rfid/scan \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: ARSHI_RFID_SECRET_KEY_2026" \
  -d '{"cardUid":"DEADBEEF99","deviceId":"ESP32_GATE_01"}'

# 4. Test Offline Queue Synchronization
curl -X POST http://localhost:5000/api/rfid/sync-offline \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: ARSHI_RFID_SECRET_KEY_2026" \
  -d '{"scans":[{"cardUid":"84C3D20A","deviceId":"ESP32_OFFLINE","timestamp":"2026-11-04T09:00:00Z"}]}'
```

---

## 2. Flashing the ESP32 Hardware

### Step 1: Install Required Arduino IDE Libraries
Open Arduino IDE -> **Library Manager** (`Ctrl+Shift+I`) and install:
1. `MFRC522` by GithubCommunity (v1.4.10+)
2. `LiquidCrystal I2C` by Frank de Brabander (or Marco Schwartz)
3. `ArduinoJson` by Benoit Blanchon (v6.21+)

### Step 2: Configure `config.h`
Open `hardware/esp32_rfid_firmware/config.h`:
- Set `WIFI_SSID` and `WIFI_PASSWORD` for your local Wi-Fi.
- Set `SERVER_HOST` to your server's local LAN IP (e.g. `http://192.168.1.15:5000`).
- Ensure `RFID_API_KEY` matches the key configured in the system settings.

### Step 3: Flash to ESP32
1. Select Board: **ESP32 Dev Module**.
2. Select Port: Your ESP32 COM port (e.g. `COM3` on Windows).
3. Click **Upload**.
4. Open **Serial Monitor** at **115200 baud** to view real-time debug logs.
