@echo off
REM Test Script for Quote History & Conversion Tracking System
REM This script verifies the implementation is working correctly

echo ===== SimplePro-v3 Quote ^& Conversion Tracking System Test =====
echo.

set API_URL=http://localhost:3001
set WEB_URL=http://localhost:3009

echo Testing API Server...
echo.

REM Test 1: Health Check
echo 1. API Health Check:
curl -s "%API_URL%/api/health" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [PASS] API server is running
) else (
    echo [FAIL] API server not running
    exit /b 1
)

echo.
echo Authenticating...

REM Get authentication token
curl -s -X POST "%API_URL%/api/auth/login" ^
    -H "Content-Type: application/json" ^
    -d "{\"username\":\"admin\",\"password\":\"Admin123!\"}" > temp_auth.json 2>nul

for /f "tokens=2 delims=:," %%a in ('type temp_auth.json ^| findstr /C:"accessToken"') do set TOKEN=%%a
set TOKEN=%TOKEN:"=%
set TOKEN=%TOKEN: =%

if "%TOKEN%"=="" (
    echo [FAIL] Authentication failed
    echo Make sure API server is running and default admin user exists
    del temp_auth.json >nul 2>&1
    exit /b 1
)

echo [PASS] Authentication successful
del temp_auth.json >nul 2>&1
echo.

echo Testing Quote History Endpoints...
echo.

REM Test 2: Get Pending Quotes
echo 2. GET /api/quote-history/pending:
curl -s -H "Authorization: Bearer %TOKEN%" "%API_URL%/api/quote-history/pending" | findstr /C:"success" >nul
if %ERRORLEVEL% EQU 0 (
    echo [PASS]
) else (
    echo [FAIL]
)

REM Test 3: Get Expired Quotes
echo 3. GET /api/quote-history/expired:
curl -s -H "Authorization: Bearer %TOKEN%" "%API_URL%/api/quote-history/expired" | findstr /C:"success" >nul
if %ERRORLEVEL% EQU 0 (
    echo [PASS]
) else (
    echo [FAIL]
)

REM Test 4: Win/Loss Analysis
echo 4. GET /api/quote-history/analytics/win-loss-reasons:
curl -s -H "Authorization: Bearer %TOKEN%" "%API_URL%/api/quote-history/analytics/win-loss-reasons?startDate=2024-01-01&endDate=2024-12-31" | findstr /C:"success" >nul
if %ERRORLEVEL% EQU 0 (
    echo [PASS]
) else (
    echo [FAIL]
)

echo.
echo Testing Conversion Tracking Endpoints...
echo.

REM Test 5: Conversion Funnel
echo 5. GET /api/conversion-tracking/funnel:
curl -s -H "Authorization: Bearer %TOKEN%" "%API_URL%/api/conversion-tracking/funnel?startDate=2024-01-01&endDate=2024-12-31" | findstr /C:"funnelStages" >nul
if %ERRORLEVEL% EQU 0 (
    echo [PASS]
) else (
    echo [FAIL]
)

REM Test 6: Conversion Rates
echo 6. GET /api/conversion-tracking/rates:
curl -s -H "Authorization: Bearer %TOKEN%" "%API_URL%/api/conversion-tracking/rates?startDate=2024-01-01&endDate=2024-12-31" | findstr /C:"overallConversionRate" >nul
if %ERRORLEVEL% EQU 0 (
    echo [PASS]
) else (
    echo [FAIL]
)

REM Test 7: Attribution Report
echo 7. GET /api/conversion-tracking/attribution:
curl -s -H "Authorization: Bearer %TOKEN%" "%API_URL%/api/conversion-tracking/attribution?startDate=2024-01-01&endDate=2024-12-31" | findstr /C:"success" >nul
if %ERRORLEVEL% EQU 0 (
    echo [PASS]
) else (
    echo [FAIL]
)

REM Test 8: Pipeline Velocity
echo 8. GET /api/conversion-tracking/pipeline-velocity:
curl -s -H "Authorization: Bearer %TOKEN%" "%API_URL%/api/conversion-tracking/pipeline-velocity" | findstr /C:"avgCycleTime" >nul
if %ERRORLEVEL% EQU 0 (
    echo [PASS]
) else (
    echo [FAIL]
)

REM Test 9: Sales Leaderboard
echo 9. GET /api/conversion-tracking/leaderboard:
curl -s -H "Authorization: Bearer %TOKEN%" "%API_URL%/api/conversion-tracking/leaderboard?startDate=2024-01-01&endDate=2024-12-31&limit=10" | findstr /C:"topPerformers" >nul
if %ERRORLEVEL% EQU 0 (
    echo [PASS]
) else (
    echo [FAIL]
)

REM Test 10: Combined Dashboard
echo 10. GET /api/conversion-tracking/dashboard:
curl -s -H "Authorization: Bearer %TOKEN%" "%API_URL%/api/conversion-tracking/dashboard?startDate=2024-01-01&endDate=2024-12-31" | findstr /C:"overallMetrics" >nul
if %ERRORLEVEL% EQU 0 (
    echo [PASS]
) else (
    echo [FAIL]
)

echo.
echo Testing Frontend Components...
echo.

REM Test 11: Web Server Running
echo 11. Web Server Health:
curl -s -o nul -w "%%{http_code}" "%WEB_URL%" > temp_web.txt 2>nul
set /p WEB_CHECK=<temp_web.txt
del temp_web.txt >nul 2>&1

if "%WEB_CHECK%"=="200" (
    echo [PASS]
) else (
    echo [SKIP] Web server not running (http code: %WEB_CHECK%)
)

REM Test 12: Frontend Component Files
echo 12. Frontend Components Exist:
set MISSING=0

if not exist "apps\web\src\app\components\conversion\ConversionFunnel.tsx" set /a MISSING+=1
if not exist "apps\web\src\app\components\conversion\WinLossAnalysis.tsx" set /a MISSING+=1
if not exist "apps\web\src\app\components\conversion\SalesPerformance.tsx" set /a MISSING+=1
if not exist "apps\web\src\app\components\conversion\QuoteHistoryDetail.tsx" set /a MISSING+=1
if not exist "apps\web\src\app\components\conversion\QuoteTimeline.tsx" set /a MISSING+=1
if not exist "apps\web\src\app\components\conversion\ConversionDashboard.tsx" set /a MISSING+=1

if %MISSING% EQU 0 (
    echo [PASS] 6 components found
) else (
    echo [FAIL] %MISSING% components missing
)

echo.
echo ===== Test Summary =====
echo.
echo API Endpoints: 10 tests
echo Frontend: 2 tests
echo.
echo All critical tests completed!
echo.
echo Next Steps:
echo 1. Visit %WEB_URL% to view the frontend
echo 2. Navigate to Analytics -^> Conversion Tracking
echo 3. Create test data by:
echo    - Creating an opportunity
echo    - Sending a quote
echo    - Creating a job
echo 4. Verify the conversion funnel populates with data
echo.
echo Documentation:
echo - QUOTE_CONVERSION_SYSTEM.md - Complete technical documentation
echo - QUOTE_CONVERSION_IMPLEMENTATION_SUMMARY.md - Implementation summary
echo.
echo For detailed integration examples, see QUOTE_CONVERSION_SYSTEM.md
echo.

pause
