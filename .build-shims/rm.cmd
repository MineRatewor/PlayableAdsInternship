@echo off
if "%1"=="-rf" (
  powershell -NoProfile -Command "Remove-Item -LiteralPath '%2' -Recurse -Force -ErrorAction SilentlyContinue"
  exit /b 0
)
exit /b 1
