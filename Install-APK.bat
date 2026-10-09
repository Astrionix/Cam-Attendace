@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo     PoultryAttend - ADB Stream Installer
echo ========================================================
echo.

set "ADB_PATH=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
if not exist "%ADB_PATH%" (
    where adb >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set "ADB_PATH=adb"
    ) else (
        echo [ERROR] ADB not found in Android SDK or PATH!
        echo Expected at: %LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
        pause
        exit /b 1
    )
)

set "APK_PATH=%~dp0output\PoultryAttend-RedmiGo.apk"
if not exist "%APK_PATH%" (
    echo [ERROR] APK not found at:
    echo %APK_PATH%
    echo Please run Build-APK.bat first!
    pause
    exit /b 1
)

echo [*] Checking connected devices...
"%ADB_PATH%" devices
echo.

echo [*] Attempting Stream Install with runtime permissions (-r -t -g --streaming)...
"%ADB_PATH%" install -r -t -g --streaming "%APK_PATH%"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [*] Stream install failed or unsupported by target OS.
    echo [*] Retrying with Standard Install (--no-streaming)...
    "%ADB_PATH%" install -r -t -g --no-streaming "%APK_PATH%"
)

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo  [SUCCESS] App installed on device successfully!
    echo ========================================================
    echo [*] Launching PoultryAttend Kiosk...
    "%ADB_PATH%" shell am start -n com.poultry.attend/.MainActivity
) else (
    echo.
    echo [FAIL] Installation failed.
    echo Please verify:
    echo  1. USB Debugging is ENABLED in Developer Options
    echo  2. On Xiaomi/Redmi: Enable "Install via USB" in Developer Options
    echo  3. Tap "Allow" on the phone prompt
)

echo.
pause
