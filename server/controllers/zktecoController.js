const Setting = require('../models/Setting');
const zktecoService = require('../services/zktecoService');

/**
 * Get current ZKTeco configuration
 */
exports.getConfig = async (req, res) => {
  try {
    const setting = await Setting.findOne() || {};
    return res.json({
      success: true,
      data: {
        zktecoIp: setting.zktecoIp || '192.168.1.201',
        zktecoPort: setting.zktecoPort || 4370,
        zktecoCommKey: setting.zktecoCommKey || 0,
        zktecoAutoSync: setting.zktecoAutoSync || false,
        zktecoLastSyncTime: setting.zktecoLastSyncTime || null
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update ZKTeco configuration
 */
exports.updateConfig = async (req, res) => {
  try {
    const { zktecoIp, zktecoPort, zktecoCommKey, zktecoAutoSync } = req.body;
    const update = {};
    if (zktecoIp !== undefined) update.zktecoIp = zktecoIp.trim();
    if (zktecoPort !== undefined) update.zktecoPort = Number(zktecoPort);
    if (zktecoCommKey !== undefined) update.zktecoCommKey = Number(zktecoCommKey);
    if (zktecoAutoSync !== undefined) update.zktecoAutoSync = Boolean(zktecoAutoSync);

    const setting = await Setting.findOneAndUpdate({}, update, { new: true, upsert: true });

    return res.json({
      success: true,
      message: 'ZKTeco settings updated successfully.',
      data: {
        zktecoIp: setting.zktecoIp,
        zktecoPort: setting.zktecoPort,
        zktecoCommKey: setting.zktecoCommKey,
        zktecoAutoSync: setting.zktecoAutoSync,
        zktecoLastSyncTime: setting.zktecoLastSyncTime
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Test network socket connection to ZKTeco MB360
 */
exports.testConnection = async (req, res) => {
  try {
    const setting = await Setting.findOne() || {};
    const ip = req.body.ip || setting.zktecoIp || '192.168.1.201';
    const port = req.body.port ? Number(req.body.port) : (setting.zktecoPort || 4370);

    const result = await zktecoService.testConnection(ip, port);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Trigger immediate manual sync from ZKTeco MB360
 */
exports.syncLogs = async (req, res) => {
  try {
    const setting = await Setting.findOne() || {};
    const ip = req.body.ip || setting.zktecoIp || '192.168.1.201';
    const port = req.body.port ? Number(req.body.port) : (setting.zktecoPort || 4370);

    const result = await zktecoService.syncAttendanceLogs(ip, port);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Import attendance logs from USB attlog.dat
 */
exports.uploadLogFile = async (req, res) => {
  try {
    let fileContent = '';

    if (req.file && req.file.buffer) {
      fileContent = req.file.buffer.toString('utf8');
    } else if (req.body && req.body.content) {
      fileContent = req.body.content;
    } else {
      return res.status(400).json({
        success: false,
        message: 'No file or file content provided. Please upload an attlog.dat file.'
      });
    }

    const result = await zktecoService.parseAttlogContent(fileContent);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ADMS Handshake / Keep-Alive (GET /iclock/cdata)
 * When MB360 Cloud Server is set to our PC IP:5000
 */
exports.handleAdmsGet = async (req, res) => {
  // Respond with standard ADMS OK acknowledgement
  res.set('Content-Type', 'text/plain');
  return res.send('OK');
};

/**
 * ADMS Real-Time Data Push (POST /iclock/cdata)
 * MB360 pushes tab-separated attendance log lines
 */
exports.handleAdmsPost = async (req, res) => {
  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const sn = req.query.SN || 'ZKTECO_MB360';
    const table = req.query.table || '';

    // If terminal is pushing attendance logs (table === ATTLOG or tabular body)
    let processedCount = 0;
    if (rawBody && (table.toUpperCase() === 'ATTLOG' || rawBody.includes('\t') || rawBody.includes(' '))) {
      const lines = rawBody.split(/\r?\n/).filter(l => l.trim().length > 0);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const deviceUserId = parts[0];
          let timestampStr = parts[1];
          if (parts.length >= 3 && parts[2].includes(':')) {
            timestampStr = `${parts[1]} ${parts[2]}`;
          }
          const timestamp = new Date(timestampStr);
          if (!isNaN(timestamp.getTime())) {
            await zktecoService.processSinglePunch({
              deviceUserId,
              timestamp,
              deviceId: `ZKTECO_${sn}`,
              isOfflineSync: false
            });
            processedCount++;
          }
        }
      }
    }

    res.set('Content-Type', 'text/plain');
    return res.send(`OK: ${processedCount}`);
  } catch (error) {
    console.error('ADMS POST error:', error);
    res.set('Content-Type', 'text/plain');
    return res.send('OK');
  }
};

/**
 * ADMS Request Poll (GET /iclock/getrequest)
 */
exports.handleAdmsGetRequest = async (req, res) => {
  res.set('Content-Type', 'text/plain');
  return res.send('OK');
};

/**
 * ADMS Device Command Response (POST /iclock/devicecmd)
 */
exports.handleAdmsDeviceCmd = async (req, res) => {
  res.set('Content-Type', 'text/plain');
  return res.send('OK');
};
