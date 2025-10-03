@echo off
REM MongoDB Replica Set Health Check Script for Windows
REM This script monitors the health and status of the MongoDB replica set

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%..\..\"

REM Load environment variables
if exist "%PROJECT_ROOT%.env.local" (
    for /f "usebackq tokens=1,* delims==" %%a in ("%PROJECT_ROOT%.env.local") do (
        if not "%%a"=="" if not "%%a:~0,1%"=="#" set "%%a=%%b"
    )
) else (
    set "MONGODB_USERNAME=admin"
    set "MONGODB_PASSWORD=password123"
)

echo ================================================
echo MongoDB Replica Set Health Check
echo ================================================
echo.

REM Check if containers are running
echo Container Status:
set "all_running=1"

for %%c in (simplepro-mongodb-primary simplepro-mongodb-secondary1 simplepro-mongodb-secondary2) do (
    docker ps --format "{{.Names}}" | findstr /B /C:"%%c" >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        for /f "delims=" %%s in ('docker inspect --format="{{.State.Status}}" %%c') do set "status=%%s"
        if "!status!"=="running" (
            echo   [OK] %%c: running
        ) else (
            echo   [ERROR] %%c: !status!
            set "all_running=0"
        )
    ) else (
        echo   [ERROR] %%c: not found
        set "all_running=0"
    )
)

if "!all_running!"=="0" (
    echo.
    echo ERROR: Not all containers are running
    echo Start the replica set with: scripts\mongodb\setup-replica-set.bat
    exit /b 1
)

echo.
echo Replica Set Status:
docker exec simplepro-mongodb-primary mongosh -u "%MONGODB_USERNAME%" -p "%MONGODB_PASSWORD%" --authenticationDatabase admin --quiet --eval "var status = rs.status(); print('Set Name: ' + status.set); print('Date: ' + status.date); print('MyState: ' + status.myState); print(''); print('Members:'); status.members.forEach(function(member) { var stateIcon = member.stateStr === 'PRIMARY' ? '*' : member.stateStr === 'SECONDARY' ? '+' : member.stateStr === 'ARBITER' ? 'o' : '?'; var healthIcon = member.health === 1 ? 'OK' : 'BAD'; print('  ' + stateIcon + ' ' + member.name); print('    State: ' + member.stateStr); print('    Health: ' + healthIcon + ' ' + member.health); print('    Uptime: ' + Math.floor(member.uptime / 60) + 'm'); if (member.optimeDate) { print('    Last Heartbeat: ' + member.lastHeartbeat); print('    Last Optime: ' + member.optimeDate); } print(''); });" 2>nul

echo.
echo Replication Lag:
docker exec simplepro-mongodb-primary mongosh -u "%MONGODB_USERNAME%" -p "%MONGODB_PASSWORD%" --authenticationDatabase admin --quiet --eval "var status = rs.status(); var primary = status.members.find(m => m.stateStr === 'PRIMARY'); if (primary) { var primaryOptime = primary.optimeDate; print('Primary optime: ' + primaryOptime); print(''); status.members.forEach(function(member) { if (member.stateStr === 'SECONDARY') { var lag = (primaryOptime - member.optimeDate) / 1000; var lagIcon = lag < 10 ? 'OK' : lag < 60 ? 'WARN' : 'ERROR'; print(lagIcon + ' ' + member.name + ': ' + lag.toFixed(2) + ' seconds behind'); } }); } else { print('WARNING: No primary found in replica set'); }" 2>nul

echo.
echo Connection Information:
docker exec simplepro-mongodb-primary mongosh -u "%MONGODB_USERNAME%" -p "%MONGODB_PASSWORD%" --authenticationDatabase admin --quiet --eval "var serverStatus = db.serverStatus(); print('Connections:'); print('  Current: ' + serverStatus.connections.current); print('  Available: ' + serverStatus.connections.available); print('  Total Created: ' + serverStatus.connections.totalCreated); print(''); print('Operations:'); print('  Inserts: ' + serverStatus.opcounters.insert); print('  Queries: ' + serverStatus.opcounters.query); print('  Updates: ' + serverStatus.opcounters.update); print('  Deletes: ' + serverStatus.opcounters.delete); print('  Commands: ' + serverStatus.opcounters.command);" 2>nul

echo.
echo Database Statistics:
docker exec simplepro-mongodb-primary mongosh -u "%MONGODB_USERNAME%" -p "%MONGODB_PASSWORD%" --authenticationDatabase admin --quiet --eval "var dbStats = db.getSiblingDB('simplepro').stats(); print('Database: simplepro'); print('  Collections: ' + dbStats.collections); print('  Data Size: ' + (dbStats.dataSize / 1024 / 1024).toFixed(2) + ' MB'); print('  Storage Size: ' + (dbStats.storageSize / 1024 / 1024).toFixed(2) + ' MB'); print('  Indexes: ' + dbStats.indexes); print('  Index Size: ' + (dbStats.indexSize / 1024 / 1024).toFixed(2) + ' MB'); print('  Documents: ' + dbStats.objects);" 2>nul

echo.
echo Performance Metrics:
docker exec simplepro-mongodb-primary mongosh -u "%MONGODB_USERNAME%" -p "%MONGODB_PASSWORD%" --authenticationDatabase admin --quiet --eval "var serverStatus = db.serverStatus(); var wiredTiger = serverStatus.wiredTiger; print('WiredTiger Cache:'); print('  Bytes In Cache: ' + (wiredTiger.cache['bytes currently in the cache'] / 1024 / 1024).toFixed(2) + ' MB'); print('  Max Bytes: ' + (wiredTiger.cache['maximum bytes configured'] / 1024 / 1024).toFixed(2) + ' MB'); print('  Pages Read: ' + wiredTiger.cache['pages read into cache']); print('  Pages Written: ' + wiredTiger.cache['pages written from cache']); print(''); print('Memory:'); print('  Resident: ' + (serverStatus.mem.resident) + ' MB'); print('  Virtual: ' + (serverStatus.mem.virtual) + ' MB');" 2>nul

echo.
echo ================================================
echo Health Check Complete
echo ================================================

endlocal
