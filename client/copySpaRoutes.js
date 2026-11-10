import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, 'dist');
const indexHtml = path.join(dist, 'index.html');

if (fs.existsSync(indexHtml)) {
  // 1. Create 404.html (Vercel static fallback for SPA)
  fs.copyFileSync(indexHtml, path.join(dist, '404.html'));

  // 2. Create physical route directories for direct URL navigation
  const routes = [
    'kiosk',
    'login',
    'dashboard',
    'attendance',
    'employees',
    'reports',
    'settings',
    'my-attendance',
    'date-wise',
    'monthly',
    'raw-scans'
  ];
  for (const r of routes) {
    const routeDir = path.join(dist, r);
    if (!fs.existsSync(routeDir)) {
      fs.mkdirSync(routeDir, { recursive: true });
    }
    fs.copyFileSync(indexHtml, path.join(routeDir, 'index.html'));
  }
  console.log('✅ Created 404.html and static SPA route entry points for Vercel');
}
