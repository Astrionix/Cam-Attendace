@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo     PoultryAttend - Standalone APK Builder
echo     Target: Redmi Go (Android 8.1 Oreo Go API 27)
echo ===================================================
echo.

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
if not exist "%JAVA_HOME%\bin\java.exe" (
    echo [ERROR] Java not found at %JAVA_HOME%
    pause
    exit /b 1
)

cd /d "%~dp0android"

echo [*] Building Standalone Debug APK via Gradle...
call gradlew.bat assembleDebug

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===================================================
    echo  [SUCCESS] APK Built Successfully!
    echo ===================================================
    if not exist "%~dp0output" mkdir "%~dp0output"
    copy /y "app\build\outputs\apk\debug\app-debug.apk" "%~dp0output\PoultryAttend-RedmiGo.apk"
    echo  APK Location:
    echo  %~dp0output\PoultryAttend-RedmiGo.apk
    echo.
    echo  You can copy this APK directly to your Redmi Go 
    echo  via USB cable or WhatsApp / Google Drive!
    echo ===================================================
) else (
    echo.
    echo [FAIL] Build encountered errors. Please check above log.
)

pause
