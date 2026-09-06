/**
 * Carga variables locales y luego .env.railway (sobrescribe) para scripts contra Railway.
 */
const path = require('path');
const fs = require('fs');

const backendRoot = path.join(__dirname, '../..');
const localEnv = path.join(backendRoot, '.env');
const railwayEnv = path.join(backendRoot, '.env.railway');

require('dotenv').config({ path: localEnv });

if (!fs.existsSync(railwayEnv)) {
  console.error('\n❌ Falta backend/.env.railway');
  console.error('   Copia .env.railway.example → .env.railway y pega tu password de Railway.\n');
  process.exit(1);
}

require('dotenv').config({ path: railwayEnv, override: true });

const host = process.env.DB_HOST || process.env.DATABASE_URL || '';
const isRailway =
  host.includes('rlwy.net') ||
  host.includes('railway.app') ||
  (process.env.DATABASE_URL || '').includes('railway');

if (!isRailway) {
  console.error('\n❌ .env.railway no apunta a Railway (host debe ser *.rlwy.net).\n');
  process.exit(1);
}

module.exports = { backendRoot, railwayEnv };
