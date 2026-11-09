# Arshi Enterprises – ESP32 + RC522 RFID Hardware Wiring Diagram

This document contains complete circuit schematics, pinout tables, and wiring instructions for the **Arshi Enterprises Smart RFID Attendance Terminal**.

---

## 1. Component List

| Component | Specification | Quantity |
| :--- | :--- | :--- |
| **Microcontroller** | ESP32 DevKit V1 (30-pin or 38-pin) | 1 |
| **RFID Reader** | RC522 (13.56 MHz SPI Module) | 1 |
| **RFID Cards/Tags** | MIFARE Classic 1K (13.56 MHz) | Multiple |
| **Display** | I2C LCD 1602 (with PCF8574 backpack) or 0.96" I2C OLED (SSD1306) | 1 |
| **Buzzer** | 5V Active Buzzer | 1 |
| **LED 1 (Green)** | 5mm LED (Clock IN Indicator) | 1 |
| **LED 2 (Blue)** | 5mm LED (Clock OUT Indicator) | 1 |
| **LED 3 (Red)** | 5mm LED (Error / Debounce Indicator) | 1 |
| **Resistors** | 220Ω / 330Ω (for LEDs) | 3 |
| **Power Source** | 5V 2A Micro-USB or External DC Power Supply | 1 |

---

## 2. Complete Wiring Pinout Table

### A. RC522 RFID Reader to ESP32 (SPI Interface)
> [!CAUTION]
> **CRITICAL VOLTAGE WARNING:** The RC522 module requires **3.3V DC**. Connecting it to 5V will permanently burn the MFRC522 chip!

| RC522 Pin | ESP32 GPIO Pin | Function / Description |
| :--- | :--- | :--- |
| **3.3V (VCC)** | **3V3** | Power (Do NOT connect to 5V/VIN) |
| **RST (Reset)** | **GPIO 22** | Reader hardware reset |
| **GND** | **GND** | Ground |
| **IRQ** | *Unconnected* | Not needed for polling |
| **MISO** | **GPIO 19** | SPI Master In Slave Out |
| **MOSI** | **GPIO 23** | SPI Master Out Slave In |
| **SCK** | **GPIO 18** | SPI Clock |
| **SDA (SS / CS)**| **GPIO 5** | SPI Chip Select |

---

### B. I2C 1602 LCD Display (with PCF8574 backpack)
| LCD I2C Pin | ESP32 Pin | Description |
| :--- | :--- | :--- |
| **GND** | **GND** | Ground |
| **VCC** | **VIN (5V)** | LCD Backlight power |
| **SDA** | **GPIO 21** | I2C Data |
| **SCL** | **GPIO 22** | I2C Clock (or GPIO 22 shared with pull-ups) |

---

### C. Status LEDs and Buzzer Feedback
| Peripheral | Pin (+) | Pin (-) | In-Series Resistor | Function |
| :--- | :--- | :--- | :--- | :--- |
| **Green LED** | **GPIO 2** | GND | 220Ω Resistor | Lights upon Clock IN |
| **Blue LED** | **GPIO 15** | GND | 220Ω Resistor | Lights upon Clock OUT |
| **Red LED** | **GPIO 13** | GND | 220Ω Resistor | Lights upon Rejected / Error / Cooldown |
| **Active Buzzer** | **GPIO 4** | GND | Direct | 1 beep = IN, 2 beeps = OUT, 3 beeps = Reject |

---

## 3. Circuit Schematic (ASCII Diagram)

```text
                     +---------------------------------------+
                     |             ESP32 DEVKIT              |
                     |                                       |
  RC522 RFID         |                                       |       I2C LCD 1602
+------------+       |                                       |     +-------------+
|    3.3V    |<------| 3V3                               VIN |---> | VCC (5V)    |
|    GND     |<------| GND                               GND |---> | GND         |
|    RST     |<------| GPIO 22                       GPIO 21 |---> | SDA         |
|    MISO    |<------| GPIO 19                       GPIO 22 |---> | SCL         |
|    MOSI    |<------| GPIO 23                               |     +-------------+
|    SCK     |<------| GPIO 18                               |
|    SDA(CS) |<------| GPIO 5                                |
+------------+       |                                       |
                     | GPIO 2  ---->[220R]--->(Green LED)----+---> GND
                     | GPIO 15 ---->[220R]--->(Blue LED)-----+---> GND
                     | GPIO 13 ---->[220R]--->(Red LED)------+---> GND
                     | GPIO 4  ------------->(+ Buzzer -)----+---> GND
                     +---------------------------------------+
```

---

## 4. Hardware Assembly Checklist

1. **Breadboard or PCB Soldering**:
   - Keep SPI wire lengths under 15 cm (6 inches) to avoid signal distortion on the 13.56 MHz carrier frequency.
2. **I2C Address Verification**:
   - If the LCD backlight turns on but no text appears, rotate the blue potentiometer on the back of the I2C backpack to adjust contrast.
   - Run an I2C scanner sketch to confirm whether the LCD address is `0x27` or `0x3F`.
3. **Power Stability**:
   - Power the ESP32 using a stable 5V / 2A adapter. Weak USB ports on computers may brownout when Wi-Fi transmits at full power (+20 dBm).
