@echo off
REM MongoDB Replica Set Keyfile Generator for Windows
REM This script generates a secure keyfile for replica set authentication

setlocal enabledelayedexpansion

set "KEYFILE_DIR=%~dp0"
set "KEYFILE_PATH=%KEYFILE_DIR%keyfile"

echo Generating MongoDB replica set keyfile...

REM Check if OpenSSL is available
where openssl >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: OpenSSL not found. Please install OpenSSL first.
    echo You can download it from: https://slproweb.com/products/Win32OpenSSL.html
    exit /b 1
)

REM Generate a secure random keyfile
openssl rand -base64 756 > "%KEYFILE_PATH%"

if %ERRORLEVEL% EQU 0 (
    echo Success: Keyfile generated successfully at: %KEYFILE_PATH%
    echo.
    echo IMPORTANT: Keep this keyfile secure!
    echo - All replica set members must use the same keyfile
    echo - Never commit this keyfile to version control
    echo.
    echo To use with Docker, mount it as read-only:
    echo   ./scripts/mongodb/keyfile:/etc/mongodb-keyfile:ro
) else (
    echo ERROR: Failed to generate keyfile
    exit /b 1
)

endlocal
