# ==============================================================
# KALA IS ART - One-Click Setup Script
# Run this ONCE to set up the database and start the backend
# ==============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$DBPassword,
    [string]$DBUser = "postgres",
    [string]$DBName = "kala_is_art"
)

$PSPath = "C:\Program Files\PostgreSQL\17\bin"
if (!(Test-Path "$PSPath\psql.exe")) {
    $PSPath = "C:\Program Files\PostgreSQL\18\bin"
}

Write-Host "`n🎨 KALA IS ART - Setup Starting..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

# Step 1: Update .env with real password
$envPath = "$PSScriptRoot\backend\.env"
$envContent = Get-Content $envPath -Raw
$envContent = $envContent -replace "DB_PASSWORD=.*", "DB_PASSWORD=$DBPassword"
$envContent = $envContent -replace "DB_USER=.*", "DB_USER=$DBUser"
$envContent = $envContent -replace "DB_NAME=.*", "DB_NAME=$DBName"
Set-Content $envPath $envContent
Write-Host "✅ .env configured with database credentials" -ForegroundColor Green

# Step 2: Create database if not exists
Write-Host "`n📦 Creating database '$DBName'..." -ForegroundColor Cyan
$env:PGPASSWORD = $DBPassword
& "$PSPath\psql.exe" -U $DBUser -c "CREATE DATABASE $DBName;" 2>$null
Write-Host "✅ Database ready" -ForegroundColor Green

# Step 3: Initialize schema
Write-Host "`n🏗️  Initializing schema..." -ForegroundColor Cyan
& "$PSPath\psql.exe" -U $DBUser -d $DBName -f "$PSScriptRoot\backend\src\config\schema.sql"
Write-Host "✅ Schema and seed data loaded" -ForegroundColor Green

# Step 4: Reset admin password with fresh bcrypt hash
Write-Host "`n🔐 Setting admin password..." -ForegroundColor Cyan
$adminSetupScript = @"
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

(async () => {
  const hash = await bcrypt.hash('Admin@123', 12);
  await pool.query(
    `UPDATE users SET password_hash = \$1, is_email_verified = TRUE, is_active = TRUE 
     WHERE email = 'admin@kalaisart.com'`,
    [hash]
  );
  console.log('Admin password set to: Admin@123');
  await pool.end();
})();
"@

$adminSetupScript | Out-File -FilePath "$PSScriptRoot\backend\setup_admin.js" -Encoding utf8
Set-Location "$PSScriptRoot\backend"
node setup_admin.js
Remove-Item "$PSScriptRoot\backend\setup_admin.js" -ErrorAction SilentlyContinue
Write-Host "✅ Admin credentials confirmed" -ForegroundColor Green

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "✨ Setup Complete!" -ForegroundColor Yellow
Write-Host "`n📧 Login Email:    admin@kalaisart.com" -ForegroundColor Cyan
Write-Host "🔑 Login Password: Admin@123" -ForegroundColor Cyan
Write-Host "`nNow run in the backend folder: npm run dev" -ForegroundColor White
Write-Host "Frontend is already running at: http://localhost:3000`n" -ForegroundColor White
