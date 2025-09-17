@echo off
echo Starting CRM WhatsApp Service...
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Navigate to WhatsApp service directory
cd /d "C:\Project\mini-crm\tes1\crm-wa"
if %errorlevel% neq 0 (
    echo ERROR: Cannot find WhatsApp service directory
    echo Expected path: C:\Project\mini-crm\tes1\crm-wa
    pause
    exit /b 1
)

echo Current directory: %CD%
echo.

:: Check if package.json exists
if not exist "package.json" (
    echo ERROR: package.json not found
    echo Please run 'npm install' first
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

:: Check if whatsapp-service.js exists
if not exist "whatsapp-service.js" (
    echo ERROR: whatsapp-service.js not found
    echo Please copy the service file to this directory
    pause
    exit /b 1
)

:: Create sessions directory if not exists
if not exist "sessions" (
    mkdir sessions
    echo Created sessions directory
)

echo Starting WhatsApp service...
echo Service will run on: http://localhost:3001
echo Health check: http://localhost:3001/health
echo.
echo Press Ctrl+C to stop the service
echo.

:: Start the service
npm run dev

pause