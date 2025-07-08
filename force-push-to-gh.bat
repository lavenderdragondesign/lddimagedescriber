@echo off
cd /d %~dp0

git init
git remote add origin https://github.com/lavenderdragondesign/lddimagedescriber.git
git branch -M main
git add .
git commit -m "Force push of Netlify-ready image description app"
git push -f origin main

pause