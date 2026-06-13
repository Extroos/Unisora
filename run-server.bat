@echo off
title Unisora Chat Server
echo Starting Unisora Chat Server...
call npm run server
if %ERRORLEVEL% neq 0 (
    echo.
    echo --------------------------------------------------
    echo Server crashed or failed to start!
    echo If you see a "compiled against a different Node.js version" error,
    echo run: npm rebuild better-sqlite3
    echo --------------------------------------------------
    echo.
)
pause
