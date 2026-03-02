# Drone Monitoring System - PowerShell Deployment Script
# Usage: Right-click -> Run with PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Drone Monitoring Deployment" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if in project root
if (-not (Test-Path "package.json")) {
    Write-Host "[ERROR] Please run this script in project root directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[OK] Project directory detected`n" -ForegroundColor Green

# Step 1: Install dependencies
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Step 1/4: Installing dependencies..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

npm install @amap/amap-jsapi-loader --save
npm install @element-plus/icons-vue --save

Write-Host "`n[OK] Dependencies installed`n" -ForegroundColor Green

# Step 2: Configure environment
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Step 2/4: Configuring environment..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

if (-not (Test-Path ".env.development")) {
    New-Item -Path ".env.development" -ItemType File | Out-Null
}

$envContent = Get-Content ".env.development" -ErrorAction SilentlyContinue

if ($envContent -notcontains "VITE_AMAP_KEY") {
    Add-Content -Path ".env.development" -Value "`n# AMap Configuration"
    Add-Content -Path ".env.development" -Value "VITE_AMAP_KEY=YOUR_AMAP_KEY_HERE"
    Add-Content -Path ".env.development" -Value "VITE_WS_URL=ws://localhost:10010/ws/drone-tracking"
    Write-Host "[OK] Environment configured" -ForegroundColor Green
    Write-Host "[WARNING] Please edit .env.development and replace YOUR_AMAP_KEY_HERE" -ForegroundColor Yellow
} else {
    Write-Host "[SKIP] Configuration already exists" -ForegroundColor Cyan
}

Write-Host ""

# Step 3: Backup original file
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Step 3/4: Backing up original file..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

if (Test-Path "src\views\Monitor.vue") {
    Copy-Item "src\views\Monitor.vue" "src\views\Monitor.vue.backup" -Force
    Write-Host "[OK] Backup created: Monitor.vue.backup" -ForegroundColor Green
} else {
    Write-Host "[INFO] Original file not found, will create new" -ForegroundColor Cyan
}

Write-Host ""

# Step 4: Instructions
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Step 4/4: Replace Monitor.vue" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "[ACTION REQUIRED]" -ForegroundColor Magenta
Write-Host ""
Write-Host "Please manually complete:" -ForegroundColor White
Write-Host "  1. Find 'Monitor_Complete.vue' from downloaded files" -ForegroundColor White
Write-Host "  2. Copy all its content" -ForegroundColor White
Write-Host "  3. Replace to src\views\Monitor.vue" -ForegroundColor White
Write-Host ""

# Create README
$readmeContent = @"
# Drone Monitoring - Deployment Complete

## Next Steps

### 1. Configure AMap Key

Visit: https://console.amap.com/
- Register/Login
- Create application
- Get Web JS API Key
- Edit .env.development and replace YOUR_AMAP_KEY_HERE

### 2. Start Project

``````
npm run dev
``````

Visit: http://localhost:5173/monitor

### 3. Backend WebSocket Format

Your backend should send messages like:

``````json
{
  "type": "position_update",
  "drones": [
    {
      "droneId": 1,
      "longitude": 121.4737,
      "latitude": 31.2304,
      "altitude": 100,
      "speed": 15.5,
      "batteryLevel": 85,
      "status": "flying"
    }
  ]
}
``````

## Troubleshooting

### Map not showing
- Check AMap Key in .env.development
- Check browser console for errors

### WebSocket connection failed
- Make sure backend is running
- Check WebSocket URL configuration

## Files

- src/views/Monitor.vue - Updated component
- src/views/Monitor.vue.backup - Original backup
- .env.development - Environment config
"@

Set-Content -Path "MONITOR_README.md" -Value $readmeContent

Write-Host "[OK] Usage guide created: MONITOR_README.md`n" -ForegroundColor Green

# Final message
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[NEXT STEPS]" -ForegroundColor Magenta
Write-Host "  1. Copy Monitor_Complete.vue to src\views\Monitor.vue" -ForegroundColor White
Write-Host "  2. Edit .env.development and add your AMap Key" -ForegroundColor White
Write-Host "  3. Run: npm run dev" -ForegroundColor White
Write-Host "  4. Visit: http://localhost:5173/monitor" -ForegroundColor White
Write-Host ""
Write-Host "[DOCS] See MONITOR_README.md for details" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"
