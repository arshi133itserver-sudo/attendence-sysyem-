const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const OBJECT_ID_FIELDS = new Set([
  '_id',
  'employee',
  'employeeDbId',
  'correctedBy',
  'modifiedBy',
  'userId',
  'attendanceId'
]);

const DATE_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'joiningDate',
  'dob',
  'firstInTime',
  'lastOutTime',
  'inTime',
  'outTime',
  'timestamp',
  'scannedAt',
  'modifiedAt',
  'entryTime',
  'zktecoLastSyncTime'
]);

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const HEX_24_REGEX = /^[0-9a-fA-F]{24}$/;

function reviveBson(obj, keyName = '') {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    if (OBJECT_ID_FIELDS.has(keyName) && HEX_24_REGEX.test(obj)) {
      return new mongoose.Types.ObjectId(obj);
    }
    if ((DATE_FIELDS.has(keyName) || ISO_DATE_REGEX.test(obj)) && !isNaN(Date.parse(obj))) {
      return new Date(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => reviveBson(item, keyName));
  }

  if (typeof obj === 'object') {
    const revived = {};
    for (const [k, v] of Object.entries(obj)) {
      revived[k] = reviveBson(v, k);
    }
    return revived;
  }

  return obj;
}

async function importToVps() {
  const targetUri = process.argv[2] || process.env.TARGET_MONGODB_URI || 'mongodb://189.72.151.50:27017/arshi_attendance';

  const backupPath = path.join(__dirname, '../backup/arshi_attendance_backup.json');
  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file not found at: ${backupPath}`);
    process.exit(1);
  }

  console.log(`Reading backup from: ${backupPath}...`);
  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  console.log(`Connecting to Target VPS MongoDB: ${targetUri.replace(/:([^:@]+)@/, ':****@')}...`);
  await mongoose.connect(targetUri);
  console.log('Connected successfully to VPS MongoDB!\n');

  for (const [collectionName, rawDocs] of Object.entries(backupData)) {
    if (!rawDocs || rawDocs.length === 0) {
      console.log(`- ${collectionName}: 0 documents (Skipped)`);
      continue;
    }

    const col = mongoose.connection.db.collection(collectionName);
    await col.deleteMany({});

    // Revive BSON types (ObjectIds and Dates)
    const revivedDocs = rawDocs.map(doc => reviveBson(doc));
    
    const result = await col.insertMany(revivedDocs);
    console.log(`- ${collectionName}: Restored ${result.insertedCount} documents with valid BSON ObjectIds & Dates`);
  }

  console.log('\nAll collections successfully restored with native BSON types!');
  await mongoose.disconnect();
}

importToVps().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
