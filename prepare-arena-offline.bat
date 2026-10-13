@echo off
rem FATH ARENA - downloads the AI model, libraries and fonts into .\vendor
rem so the booth game works without internet. Run once, with internet.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\arena-offline.ps1" %*
