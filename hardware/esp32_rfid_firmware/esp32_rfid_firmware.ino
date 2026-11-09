/**
 * Project: Arshi Enterprises – Smart RFID Employee Attendance Management System
 * Firmware: ESP32 + MFRC522 RFID + I2C LCD + Status LEDs + Buzzer
 *
 * Description:
 * Reads 13.56MHz Mifare RFID card UIDs, authenticates with Node.js backend using
 * REST API and secure X-API-KEY header, displays feedback on I2C LCD, provides
 * auditory/visual cues, and caches scans offline in LittleFS when disconnected.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>
#include <FS.h>
#include <LittleFS.h>

#include "config.h"

// Hardware instances
MFRC522 mfrc522(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(LCD_I2C_ADDR, 16, 2);

// Runtime variables
unsigned long lastScanTime = 0;
String lastScannedUid = "";
const char* OFFLINE_FILE = "/offline_scans.json";

// Function Declarations
void connectWiFi();
void triggerBuzzer(int count, int delayMs);
void setLedStatus(const char* color);
void displayLcd(const String& line1, const String& line2);
void processCardScan(String cardUid);
void saveOfflineScan(String cardUid);
void syncOfflineScans();

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[ARSHI ENTERPRISES] Smart RFID Attendance Node Initializing...");

  // Initialize GPIOs
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_BLUE_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_BLUE_PIN, LOW);
  digitalWrite(LED_RED_PIN, LOW);

  // Initialize I2C LCD
  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  displayLcd("ARSHI ENTERPRISE", "RFID SYSTEM V1.0");

  // Initialize LittleFS for Offline Storage
  if (!LittleFS.begin(true)) {
    Serial.println("[FS] LittleFS Mount Failed! Offline storage disabled.");
  } else {
    Serial.println("[FS] LittleFS Mounted successfully.");
  }

  // Initialize SPI & RC522
  SPI.begin();
  mfrc522.PCD_Init();
  delay(100);
  mfrc522.PCD_DumpVersionToSerial();

  // Connect to Wi-Fi
  connectWiFi();

  // Test Beep (2 quick beeps on boot)
  triggerBuzzer(2, 80);
  displayLcd("ARSHI ENTERPRISE", "SCAN CARD READY");
}

void loop() {
  // Ensure Wi-Fi is connected, or attempt auto-reconnect
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastReconnectAttempt = 0;
    if (millis() - lastReconnectAttempt > 10000) {
      lastReconnectAttempt = millis();
      Serial.println("[WiFi] Reconnecting...");
      WiFi.reconnect();
    }
  } else {
    // If online, check and flush offline scans if any exist
    syncOfflineScans();
  }

  // Check for new RFID Card
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Extract Card UID
  String cardUid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) cardUid += "0";
    cardUid += String(mfrc522.uid.uidByte[i], HEX);
  }
  cardUid.toUpperCase();

  // Local Debounce to prevent multiple reads of the same card in 3 seconds
  if (cardUid == lastScannedUid && (millis() - lastScanTime < LOCAL_DEBOUNCE_MS)) {
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
    return;
  }

  lastScanTime = millis();
  lastScannedUid = cardUid;

  Serial.println("\n[RFID] Card Detected: " + cardUid);
  displayLcd("READING CARD...", cardUid);

  // Process Scan
  processCardScan(cardUid);

  // Halt PICC
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}

/**
 * Connect to Office Wi-Fi Network
 */
void connectWiFi() {
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);
  displayLcd("CONNECTING WIFI", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected! IP: " + WiFi.localIP().toString());
    displayLcd("WIFI CONNECTED", WiFi.localIP().toString().c_str());
    delay(1500);
  } else {
    Serial.println("\n[WiFi] Connection timeout. Operating in offline buffer mode.");
    displayLcd("OFFLINE MODE", "READY TO SCAN");
    delay(1500);
  }
}

/**
 * Transmit Card UID to Node.js Backend REST API
 */
void processCardScan(String cardUid) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] No Wi-Fi. Queuing scan offline.");
    saveOfflineScan(cardUid);
    setLedStatus("red");
    triggerBuzzer(1, 200);
    displayLcd("SAVED OFFLINE", cardUid);
    delay(2000);
    displayLcd("ARSHI ENTERPRISE", "SCAN CARD READY");
    return;
  }

  HTTPClient http;
  String url = String(SERVER_HOST) + String(SCAN_ENDPOINT);
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-KEY", RFID_API_KEY);
  http.setTimeout(HTTP_TIMEOUT_MS);

  // Build JSON request payload
  StaticJsonDocument<256> doc;
  doc["cardUid"] = cardUid;
  doc["deviceId"] = DEVICE_ID;

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.POST(requestBody);
  Serial.printf("[HTTP] POST %s -> Response Code: %d\n", url.c_str(), httpCode);

  if (httpCode > 0) {
    String responseJson = http.getString();
    Serial.println("[HTTP] Response: " + responseJson);

    StaticJsonDocument<512> resDoc;
    DeserializationError error = deserializeJson(resDoc, responseJson);

    if (!error) {
      String status = resDoc["status"] | "ERROR";
      String scanType = resDoc["scanType"] | "";
      String empName = resDoc["employee"]["name"] | "Employee";
      String timeStr = resDoc["time"] | "";
      String msg = resDoc["message"] | "";

      if (status == "SUCCESS") {
        if (scanType == "IN") {
          setLedStatus("green");
          triggerBuzzer(1, 150); // 1 beep for IN
          displayLcd("WELCOME " + empName.substring(0, 8), timeStr);
        } else {
          setLedStatus("blue");
          triggerBuzzer(2, 120); // 2 beeps for OUT
          displayLcd("BYE " + empName.substring(0, 12), "CHECKOUT SUCCESS");
        }
      } else if (status == "DUPLICATE_DEBOUNCED") {
        setLedStatus("red");
        triggerBuzzer(2, 80);
        displayLcd("COOLDOWN ACTIVE", "WAIT TO SCAN");
      } else if (status == "UNKNOWN_CARD") {
        setLedStatus("red");
        triggerBuzzer(3, 250); // 3 error beeps
        displayLcd("ACCESS DENIED", "UNKNOWN CARD");
      } else {
        setLedStatus("red");
        triggerBuzzer(3, 250);
        displayLcd("ERROR", status);
      }
    } else {
      setLedStatus("red");
      triggerBuzzer(3, 250);
      displayLcd("PARSE ERROR", "INVALID JSON");
    }
  } else {
    // Network or server connection failed -> queue scan locally
    Serial.printf("[HTTP] Failed! Error: %s. Saving offline.\n", http.errorToString(httpCode).c_str());
    saveOfflineScan(cardUid);
    setLedStatus("red");
    triggerBuzzer(1, 200);
    displayLcd("SAVED OFFLINE", "SERVER OFFLINE");
  }

  http.end();
  delay(2000);
  setLedStatus("off");
  displayLcd("ARSHI ENTERPRISE", "SCAN CARD READY");
}

/**
 * Append scan event to offline LittleFS queue
 */
void saveOfflineScan(String cardUid) {
  File file = LittleFS.open(OFFLINE_FILE, "a");
  if (!file) {
    Serial.println("[FS] Failed to open offline scans file for appending.");
    return;
  }

  StaticJsonDocument<128> scan;
  scan["cardUid"] = cardUid;
  scan["deviceId"] = DEVICE_ID;
  scan["timestamp"] = millis(); // Firmware relative timestamp

  serializeJson(scan, file);
  file.println();
  file.close();
  Serial.println("[FS] Scan saved offline successfully.");
}

/**
 * Batch upload offline scans to backend when Wi-Fi returns
 */
void syncOfflineScans() {
  if (!LittleFS.exists(OFFLINE_FILE)) return;

  File file = LittleFS.open(OFFLINE_FILE, "r");
  if (!file || file.size() == 0) {
    if (file) file.close();
    LittleFS.remove(OFFLINE_FILE);
    return;
  }

  Serial.println("[SYNC] Found offline scans! Synchronizing with server...");
  displayLcd("SYNCING DATA...", "PLEASE WAIT");

  DynamicJsonDocument doc(4096);
  JsonArray scans = doc.createNestedArray("scans");

  while (file.available()) {
    String line = file.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) {
      StaticJsonDocument<128> item;
      deserializeJson(item, line);
      scans.add(item);
    }
  }
  file.close();

  if (scans.size() == 0) {
    LittleFS.remove(OFFLINE_FILE);
    return;
  }

  HTTPClient http;
  String url = String(SERVER_HOST) + String(SYNC_ENDPOINT);
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-KEY", RFID_API_KEY);

  String payload;
  serializeJson(doc, payload);

  int code = http.POST(payload);
  if (code == 200) {
    Serial.println("[SYNC] Offline scans synchronized successfully!");
    LittleFS.remove(OFFLINE_FILE); // Clear queue on success
    triggerBuzzer(2, 100);
    displayLcd("SYNC COMPLETE", "ALL SCANS SENT");
    delay(1500);
  } else {
    Serial.printf("[SYNC] Failed to sync. Will retry later. HTTP: %d\n", code);
  }

  http.end();
}

/**
 * Buzzer feedback helper
 */
void triggerBuzzer(int count, int delayMs) {
  for (int i = 0; i < count; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(delayMs);
    digitalWrite(BUZZER_PIN, LOW);
    if (i < count - 1) delay(80);
  }
}

/**
 * Set visual LED feedback (green, blue, red, off)
 */
void setLedStatus(const char* color) {
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_BLUE_PIN, LOW);
  digitalWrite(LED_RED_PIN, LOW);

  if (strcmp(color, "green") == 0) {
    digitalWrite(LED_GREEN_PIN, HIGH);
  } else if (strcmp(color, "blue") == 0) {
    digitalWrite(LED_BLUE_PIN, HIGH);
  } else if (strcmp(color, "red") == 0) {
    digitalWrite(LED_RED_PIN, HIGH);
  }
}

/**
 * LCD display helper
 */
void displayLcd(const String& line1, const String& line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1.substring(0, 16));
  lcd.setCursor(0, 1);
  lcd.print(line2.substring(0, 16));
}
