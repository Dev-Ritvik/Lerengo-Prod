@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "WEB=%ROOT%web"
set "URL=http://localhost:3000"
set "PORT=3000"
set "MAX_TRIES=60"
set "WAIT_SEC=1"

if not exist "%WEB%\package.json" set "WEB=E:\lerengo\lerengo\web"

if not exist "%WEB%\package.json" (
  echo Could not find web\package.json.
  echo Expected "%ROOT%web" or "E:\lerengo\lerengo\web".
  exit /b 1
)

call :is_port_listening %PORT%
if errorlevel 1 (
  echo Starting LerenGO dev server on port %PORT%...
  start "LerenGO Dev Server" /min /D "%WEB%" npm.cmd run dev
) else (
  echo LerenGO server already listening on port %PORT%.
)

set /a TRY_COUNT=0

:wait_for_server
set /a TRY_COUNT+=1
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 goto open_site

if %TRY_COUNT% GEQ %MAX_TRIES% (
  echo Could not reach %URL% after %MAX_TRIES% attempts.
  exit /b 1
)

timeout /t %WAIT_SEC% /nobreak >nul
goto wait_for_server

:open_site
start "" "%URL%"
exit /b 0

:is_port_listening
set "_PORT=%~1"
netstat -ano | findstr /i "LISTENING" | findstr /r /c:":%_PORT% " >nul 2>nul
if errorlevel 1 exit /b 1
exit /b 0
