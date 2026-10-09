@echo off
echo ======================================================================
echo           🐔 PoultryAttend - Kiosk OTA Update Publisher
echo ======================================================================
echo.

set /p VERSION="Enter new version (e.g. v1.0.1): "
if "%VERSION%"=="" (
    echo [ERROR] Version cannot be empty.
    pause
    exit /b 1
)

echo.
echo [*] Building Release APK for %VERSION%...
cd /d "%~dp0\android"
call .\gradlew.bat assembleRelease

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Gradle build failed!
    cd /d "%~dp0"
    pause
    exit /b 1
)

cd /d "%~dp0"
if not exist "output" mkdir "output"
copy /y "android\app\build\outputs\apk\release\*.apk" "output\PoultryAttend-%VERSION%.apk" >nul

echo.
echo [SUCCESS] APK built successfully: output\PoultryAttend-%VERSION%.apk
echo.
echo ----------------------------------------------------------------------
echo  To publish this update Over-The-Air to all kiosk terminals:
echo.
echo  Option 1 (Instant GitHub Tag & Auto-Release via GitHub Actions):
echo     git tag %VERSION%
echo     git push origin %VERSION%
echo.
echo  Option 2 (Manual Upload in Browser):
echo     1. Open https://github.com/Astrionix/Cam-Attendace/releases/new
echo     2. Set tag to: %VERSION%
echo     3. Drag and drop 'output\PoultryAttend-%VERSION%.apk'
echo     4. Click 'Publish release'
echo ----------------------------------------------------------------------
echo.
pause
