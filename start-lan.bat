@echo off
rem Trafalgar Park - LAN mode (laptop = host, iPad = screen). Double-click this file.
cd /d "%~dp0"
start "" "http://localhost:8000/lan.html"
python serve.py --lan
pause
