/**
 * Arshi Enterprises - ESP32 Smart RFID Reader Configuration
 * Hardware: ESP32 DevKit v1 + RC522 RFID Reader + I2C 1602 LCD + Buzzer + LEDs
 */

#ifndef CONFIG_H
#define CONFIG_H

// =================== Wi-Fi Configuration ===================
#define WIFI_SSID       "Arshi_Office_WiFi"       // Your Wi-Fi SSID
#define WIFI_PASSWORD   "ArshiSecurePass2026"     // Your Wi-Fi Password

// =================== Backend Server API ====================
// Replace with your Node.js server IP and port (e.g. http://192.168.1.50:5000 or domain)
#define SERVER_HOST     "http://192.168.1.50:5000"
#define SCAN_ENDPOINT   "/api/rfid/scan"
#define SYNC_ENDPOINT   "/api/rfid/sync-offline"

// Hardware security API key (Matches Setting in backend)
#define RFID_API_KEY    "ARSHI_RFID_SECRET_KEY_2026"
#define DEVICE_ID       "ESP32_FRONT_GATE_01"

// =================== Pin Assignments =======================
// RC522 SPI Pins (Standard ESP32 VSPI)
#define SS_PIN          5    // SDA (Chip Select)
#define RST_PIN         22   // Reset pin
// SCK  -> GPIO 18
// MISO -> GPIO 19
// MOSI -> GPIO 23

// Feedback Pins
#define BUZZER_PIN      4    // Active or Passive Buzzer
#define LED_GREEN_PIN   2    // Clock IN Indicator
#define LED_BLUE_PIN    15   // Clock OUT Indicator
#define LED_RED_PIN     13   // Error / Cooldown Indicator

// I2C LCD/OLED Pins
#define I2C_SDA         21
#define I2C_SCL         22
#define LCD_I2C_ADDR    0x27 // Usually 0x27 or 0x3F

// =================== Timing Parameters =====================
#define LOCAL_DEBOUNCE_MS   3000   // Firmware card debounce (3 seconds)
#define HTTP_TIMEOUT_MS     5000   // Network request timeout

#endif // CONFIG_H
