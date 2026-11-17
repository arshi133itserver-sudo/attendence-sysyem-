const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function exportDatabase() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);

  const backupDir = path.join(__dirname, '../backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const collections = await mongoose.connection.db.listCollections().toArray();
  const backupData = {};

  for (const c of collections) {
    const docs = await mongoose.connection.db.collection(c.name).find({}).toArray();
    backupData[c.name] = docs;
    console.log(`Exported ${c.name}: ${docs.length} documents`);
  }

  const backupPath = path.join(backupDir, 'arshi_attendance_backup.json');
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`\nFull Backup saved successfully to: ${backupPath} (${(fs.statSync(backupPath).size / 1024).toFixed(1)} KB)`);

  await mongoose.disconnect();
}

exportDatabase().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
