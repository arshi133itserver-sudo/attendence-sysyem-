const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function importToVps() {
  const targetUri = process.argv[2] || process.env.TARGET_MONGODB_URI;

  if (!targetUri) {
    console.error('ERROR: Please provide target MongoDB URI.');
    console.log('Usage: node scripts/import_to_vps.js "mongodb://username:password@YOUR_VPS_IP:27017/arshi_attendance"');
    process.exit(1);
  }

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

  for (const [collectionName, docs] of Object.entries(backupData)) {
    if (!docs || docs.length === 0) {
      console.log(`- ${collectionName}: 0 documents (Skipped)`);
      continue;
    }

    const col = mongoose.connection.db.collection(collectionName);
    // Optional: clear existing records in target collection to avoid duplicate key errors
    await col.deleteMany({});
    
    // Insert documents
    const result = await col.insertMany(docs);
    console.log(`- ${collectionName}: Restored ${result.insertedCount} documents`);
  }

  console.log('\nAll data has been successfully imported to your VPS MongoDB!');
  await mongoose.disconnect();
}

importToVps().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
