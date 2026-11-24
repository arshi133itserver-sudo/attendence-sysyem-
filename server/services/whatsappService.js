const path = require('path');
const fs = require('fs');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const Setting = require('../models/Setting');

class WhatsAppService {
  constructor() {
    this.sock = null;
    this.isConnected = false;
    this.currentQrDataUrl = null;
    this.sessionDir = path.join(__dirname, '../data/whatsapp_session');
    this.reconnectTimer = null;
    this.isInitializing = false;
  }

  // Initialize Baileys Socket
  async init() {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      if (!fs.existsSync(this.sessionDir)) {
        fs.mkdirSync(this.sessionDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);

      this.sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Arshi Enterprises', 'Chrome', '1.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.currentQrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
            console.log('📲 [WhatsApp Service] New QR Code generated. Scan from Admin Portal.');
          } catch (qrErr) {
            console.error('Failed to generate QR data URL:', qrErr);
          }
        }

        if (connection === 'open') {
          this.isConnected = true;
          this.currentQrDataUrl = null;
          console.log(`✅ [WhatsApp Service] Connected successfully as: ${this.sock.user?.id || 'Admin'}`);
        }

        if (connection === 'close') {
          this.isConnected = false;
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`⚠️ [WhatsApp Service] Connection closed (code ${statusCode}). Reconnect: ${shouldReconnect}`);

          if (shouldReconnect) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => {
              this.isInitializing = false;
              this.init();
            }, 5000);
          } else {
            console.log('🚪 [WhatsApp Service] Session logged out. Awaiting new scan.');
            this.currentQrDataUrl = null;
          }
        }
      });
    } catch (err) {
      console.error('❌ [WhatsApp Service] Failed to initialize socket:', err.message);
    } finally {
      this.isInitializing = false;
    }
  }

  // Return connection status and QR code
  getStatus() {
    return {
      isConnected: this.isConnected,
      hasQr: !!this.currentQrDataUrl,
      qrDataUrl: this.currentQrDataUrl,
      user: this.sock?.user || null
    };
  }

  // Fetch all WhatsApp groups the connected phone belongs to
  async getGroups() {
    if (!this.sock || !this.isConnected) {
      return [];
    }

    try {
      const groupData = await this.sock.groupFetchAllParticipating();
      const groups = Object.values(groupData).map((g) => ({
        id: g.id,
        name: g.subject,
        creation: g.creation,
        owner: g.owner,
        participantsCount: g.participants ? g.participants.length : 0
      }));
      return groups;
    } catch (err) {
      console.error('Failed to fetch WhatsApp groups:', err.message);
      return [];
    }
  }

  // Formats recipient JID (Group or Phone number)
  normalizeJid(target) {
    if (!target) return null;
    let clean = String(target).trim();
    if (clean.includes('@g.us') || clean.includes('@s.whatsapp.net')) {
      return clean;
    }
    // If phone number
    clean = clean.replace(/[^0-9]/g, '');
    if (clean.length === 10) {
      clean = '91' + clean; // Default to India country code
    }
    return clean + '@s.whatsapp.net';
  }

  // Send Selfie Punch Notification to configured WhatsApp Group / Admin
  async sendSelfiePunchAlert({ request, employee, cleanType, snapTime, remarks, location }) {
    try {
      const setting = await Setting.findOne();
      if (setting && setting.whatsappNotificationsEnabled === false) {
        console.log('ℹ️ WhatsApp notifications disabled in settings.');
        return;
      }

      // 1. Resolve Target JID (Group takes highest priority, then Admin phone, then .env fallback)
      let target = setting?.whatsappGroupId || setting?.whatsappAdminPhone || process.env.WHATSAPP_GROUP_ID;
      const targetJid = this.normalizeJid(target);

      // Format Date & Time in IST
      const istDate = new Date(snapTime || Date.now());
      const dateStr = istDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const timeStr = istDate.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      // Format Location
      let locText = '📍 *Location:* Location permission not provided';
      let mapsLink = '';
      if (location && location.latitude && location.longitude) {
        const lat = Number(location.latitude).toFixed(6);
        const lng = Number(location.longitude).toFixed(6);
        const acc = location.accuracy ? ` (±${location.accuracy}m)` : '';
        locText = `📍 *GPS Location:* \`${lat}, ${lng}\`${acc}`;
        mapsLink = `🗺️ *Google Maps:* https://www.google.com/maps?q=${lat},${lng}`;
      }

      // Build WhatsApp Alert Message
      const messageText = [
        '📸 *ARSHI ENTERPRISES — SELFIE ATTENDANCE ALERT*',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        `👤 *Staff:* *${employee.fullName}* (\`${employee.employeeId || 'ID'}\`)`,
        `🏢 *Department:* ${employee.department || 'Operations'}`,
        `⏱️ *Punch Type:* *CLOCK ${cleanType}* (${cleanType === 'IN' ? 'Office Entry' : 'Office Exit'})`,
        `📅 *Punch Time:* ${dateStr} • *${timeStr} IST*`,
        locText,
        mapsLink,
        `💬 *Staff Note:* _"${remarks || 'Selfie punch submitted from App'}"_`,
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '⚡ *Status:* ⏳ *Pending Admin Approval*',
        '👉 _Please check Admin Dashboard to verify and approve/reject._'
      ].filter(Boolean).join('\n');

      // 2. Send via Baileys if connected
      if (this.sock && this.isConnected && targetJid) {
        let sent = false;

        // Try sending with Selfie Photo attachment
        if (request?.selfiePhoto && request.selfiePhoto.startsWith('data:image')) {
          try {
            const base64Data = request.selfiePhoto.replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');

            await this.sock.sendMessage(targetJid, {
              image: imageBuffer,
              caption: messageText
            });
            sent = true;
            console.log(`✅ [WhatsApp Service] Selfie punch alert with photo sent to ${targetJid}`);
          } catch (imgErr) {
            console.warn('Failed to send photo on WhatsApp, falling back to text:', imgErr.message);
          }
        }

        // Fallback to text message if photo failed or was absent
        if (!sent) {
          await this.sock.sendMessage(targetJid, { text: messageText });
          console.log(`✅ [WhatsApp Service] Selfie punch text alert sent to ${targetJid}`);
        }
        return { success: true, method: 'baileys', target: targetJid };
      }

      // 3. Optional External HTTP Gateway Fallback (e.g., Green-API / UltraMsg)
      const gatewayUrl = setting?.whatsappApiGatewayUrl || process.env.WHATSAPP_API_URL;
      if (gatewayUrl && target) {
        try {
          const payload = {
            chatId: targetJid || target,
            message: messageText,
            image: request?.selfiePhoto || null
          };
          const response = await fetch(gatewayUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const resJson = await response.json().catch(() => ({}));
          console.log('✅ [WhatsApp Service] Alert sent via HTTP Gateway:', resJson);
          return { success: true, method: 'gateway', response: resJson };
        } catch (gwErr) {
          console.error('HTTP Gateway error:', gwErr.message);
        }
      }

      console.warn('⚠️ [WhatsApp Service] Not connected or no target group configured.');
      return { success: false, reason: 'Not connected or no group configured' };
    } catch (error) {
      console.error('❌ [WhatsApp Service] Error sending selfie punch alert:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Send custom test message
  async sendTestMessage(targetJid) {
    if (!this.sock || !this.isConnected) {
      throw new Error('WhatsApp is not connected. Please scan the QR code first.');
    }
    const cleanJid = this.normalizeJid(targetJid);
    if (!cleanJid) {
      throw new Error('Valid Group ID or Phone Number is required.');
    }

    const testMsg = [
      '✅ *ARSHI ENTERPRISES — WHATSAPP TEST ALERT*',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'Aapka WhatsApp notification system successfully connect ho chuka hai!',
      'Ab jab bhi koi staff selfie punch karega, turant is group me photo, live GPS location aur details automatically deliver hongi.',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      `🕒 *Timestamp:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
    ].join('\n');

    await this.sock.sendMessage(cleanJid, { text: testMsg });
    return { success: true, target: cleanJid };
  }

  // Logout and clear session
  async logout() {
    try {
      if (this.sock) {
        await this.sock.logout().catch(() => {});
        this.sock.end();
        this.sock = null;
      }
      this.isConnected = false;
      this.currentQrDataUrl = null;

      if (fs.existsSync(this.sessionDir)) {
        fs.rmSync(this.sessionDir, { recursive: true, force: true });
      }
      console.log('🚪 [WhatsApp Service] Logged out and session cleared.');

      // Restart fresh to generate new QR
      setTimeout(() => this.init(), 1000);
      return { success: true, message: 'Logged out successfully' };
    } catch (err) {
      console.error('Logout error:', err.message);
      throw err;
    }
  }
}

const whatsappService = new WhatsAppService();

// Auto-start on load
whatsappService.init().catch((err) => {
  console.warn('Initial WhatsApp start warning:', err.message);
});

module.exports = whatsappService;
