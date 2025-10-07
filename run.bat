@echo off
setlocal enabledelayedexpansion
title Farmer Land Records - Starting...

:: Activate virtual environment
call venv\Scripts\activate.bat

:: Set Python executable (now using virtual environment)
set PYTHON=python

:: Check if Python is installed
%PYTHON% --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in your PATH.
    echo Please install Python 3.7 or later from https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Check if virtual environment is active
if "%VIRTUAL_ENV%" == "" (
    echo Failed to activate virtual environment.
    pause
    exit /b 1
)

echo Virtual environment activated: %VIRTUAL_ENV%
echo Installing required packages...
%PYTHON% -m pip install --upgrade pip
%PYTHON% -m pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo Failed to install required packages.
    pause
    exit /b 1
)

echo Starting Farmer Land Records Application...
echo.
echo Access the application at: http://localhost:5000
echo Press Ctrl+C to stop the server.
echo.

%PYTHON% app.py

if %errorlevel% neq 0 (
    echo.
    echo An error occurred while starting the application.
    pause
    exit /b 1
)

pause
