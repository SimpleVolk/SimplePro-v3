@echo off
REM MongoDB Replica Set Setup Script for Windows
REM This script automates the complete setup of a MongoDB replica set

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%..\..\"

echo ================================================
echo MongoDB Replica Set Setup for SimplePro-v3
echo ================================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop first.
    exit /b 1
)

REM Load environment variables
if exist "%PROJECT_ROOT%.env.local" (
    echo [OK] Loading environment variables from .env.local
    for /f "usebackq tokens=1,* delims==" %%a in ("%PROJECT_ROOT%.env.local") do (
        if not "%%a"=="" if not "%%a:~0,1%"=="#" set "%%a=%%b"
    )
) else (
    echo [WARN] .env.local not found, using defaults
    set "MONGODB_USERNAME=admin"
    set "MONGODB_PASSWORD=password123"
    set "MONGODB_DATABASE=simplepro"
)

REM Step 1: Generate keyfile if not exists
echo.
echo Step 1: Generating replica set keyfile...
if not exist "%SCRIPT_DIR%keyfile" (
    where openssl >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: OpenSSL not found. Please install OpenSSL first.
        exit /b 1
    )
    openssl rand -base64 756 > "%SCRIPT_DIR%keyfile"
    echo [OK] Keyfile generated successfully
) else (
    echo [OK] Keyfile already exists
)

REM Step 2: Stop existing containers
echo.
echo Step 2: Stopping existing MongoDB containers...
cd /d "%PROJECT_ROOT%"
docker-compose -f docker-compose.mongodb-replica.yml down -v >nul 2>&1
echo [OK] Cleaned up existing containers

REM Step 3: Create network if not exists
echo.
echo Step 3: Creating Docker network...
docker network inspect storage-network >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    docker network create storage-network --subnet=172.22.0.0/24
    echo [OK] Network created
) else (
    echo [OK] Network already exists
)

REM Step 4: Start replica set containers
echo.
echo Step 4: Starting replica set containers...
docker-compose -f docker-compose.mongodb-replica.yml up -d
echo [OK] Containers started

REM Step 5: Wait for primary node
echo.
echo Step 5: Waiting for primary node to be ready...
set ATTEMPT=0
:wait_primary
set /a ATTEMPT+=1
if %ATTEMPT% GTR 30 (
    echo ERROR: Primary node failed to start
    exit /b 1
)
docker exec simplepro-mongodb-primary mongosh --quiet --eval "db.adminCommand('ping')" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   Waiting... (attempt %ATTEMPT%/30)
    timeout /t 2 /nobreak >nul
    goto wait_primary
)
echo [OK] Primary node is ready

REM Step 6: Initialize replica set
echo.
echo Step 6: Initializing replica set...
docker exec simplepro-mongodb-primary mongosh --quiet --eval "var config = { _id: 'simplepro-rs', version: 1, members: [ { _id: 0, host: '172.22.0.10:27017', priority: 2 }, { _id: 1, host: '172.22.0.11:27017', priority: 1 }, { _id: 2, host: '172.22.0.12:27017', priority: 1 } ] }; try { var result = rs.initiate(config); if (result.ok === 1) { print('OK'); } } catch (e) { if (e.codeName === 'AlreadyInitialized') { print('OK'); } }"
echo [OK] Replica set initiated

REM Step 7: Wait for stabilization
echo.
echo Step 7: Waiting for replica set to stabilize...
timeout /t 15 /nobreak >nul

REM Step 8: Wait for primary election
echo.
echo Step 8: Waiting for primary election...
set ATTEMPT=0
:wait_election
set /a ATTEMPT+=1
if %ATTEMPT% GTR 30 (
    echo ERROR: Primary election failed
    exit /b 1
)
for /f "delims=" %%i in ('docker exec simplepro-mongodb-primary mongosh --quiet --eval "try { var status = rs.status(); var primary = status.members.find(m => m.stateStr === 'PRIMARY'); print(primary ? 'found' : 'none'); } catch (e) { print('none'); }" 2^>nul') do set "PRIMARY=%%i"
if not "!PRIMARY!"=="found" (
    echo   Waiting for primary... (attempt %ATTEMPT%/30)
    timeout /t 2 /nobreak >nul
    goto wait_election
)
echo [OK] Primary elected successfully

REM Step 9: Create admin user
echo.
echo Step 9: Creating admin user...
docker exec simplepro-mongodb-primary mongosh admin --quiet --eval "try { db.createUser({ user: '%MONGODB_USERNAME%', pwd: '%MONGODB_PASSWORD%', roles: [ { role: 'root', db: 'admin' }, { role: 'userAdminAnyDatabase', db: 'admin' }, { role: 'readWriteAnyDatabase', db: 'admin' }, { role: 'dbAdminAnyDatabase', db: 'admin' }, { role: 'clusterAdmin', db: 'admin' } ] }); print('OK'); } catch (e) { if (e.codeName === 'DuplicateKey') { print('OK'); } }"
echo [OK] Admin user created

REM Step 10: Create application user
echo.
echo Step 10: Creating application user...
docker exec simplepro-mongodb-primary mongosh admin -u "%MONGODB_USERNAME%" -p "%MONGODB_PASSWORD%" --quiet --eval "var db = db.getSiblingDB('%MONGODB_DATABASE%'); try { db.createUser({ user: 'simplepro_app', pwd: '%MONGODB_PASSWORD%', roles: [ { role: 'readWrite', db: '%MONGODB_DATABASE%' }, { role: 'dbAdmin', db: '%MONGODB_DATABASE%' } ] }); print('OK'); } catch (e) { if (e.codeName === 'DuplicateKey') { print('OK'); } }"
echo [OK] Application user created

REM Step 11: Display status
echo.
echo Step 11: Verifying replica set status...
docker exec simplepro-mongodb-primary mongosh -u "%MONGODB_USERNAME%" -p "%MONGODB_PASSWORD%" --authenticationDatabase admin --quiet --eval "var status = rs.status(); print(''); print('Replica Set: ' + status.set); print('Members:'); status.members.forEach(function(member) { var icon = member.stateStr === 'PRIMARY' ? '*' : member.stateStr === 'SECONDARY' ? '+' : '-'; print('  ' + icon + ' ' + member.name + ': ' + member.stateStr + ' (health: ' + member.health + ')'); });"

REM Display connection information
echo.
echo ================================================
echo Replica Set Setup Complete!
echo ================================================
echo.
echo Connection String (with authentication):
echo mongodb://%MONGODB_USERNAME%:%MONGODB_PASSWORD%@localhost:27017,localhost:27018,localhost:27019/%MONGODB_DATABASE%?replicaSet=simplepro-rs^&authSource=admin^&retryWrites=true^&w=majority
echo.
echo Docker Internal Connection String:
echo mongodb://%MONGODB_USERNAME%:%MONGODB_PASSWORD%@172.22.0.10:27017,172.22.0.11:27017,172.22.0.12:27017/%MONGODB_DATABASE%?replicaSet=simplepro-rs^&authSource=admin^&retryWrites=true^&w=majority
echo.
echo Member Ports:
echo   Primary:    localhost:27017
echo   Secondary1: localhost:27018
echo   Secondary2: localhost:27019
echo.
echo Monitoring:
echo   MongoDB Exporter: http://localhost:9216/metrics
echo.
echo Next Steps:
echo   1. Update apps/api/.env.local with the connection string above
echo   2. Test the replica set: scripts\mongodb\check-replica-health.bat
echo   3. Test failover: docker stop simplepro-mongodb-primary
echo   4. Configure monitoring: Add Prometheus scraping for port 9216
echo.

endlocal
