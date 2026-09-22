@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  ============================================================
echo   ΑΒΥΣΣΟΣ - ανέβασμα του Χάρτη κατάδυσης στο GitHub
echo  ============================================================
echo.
echo  Μόλις ανέβει, το GitHub χτίζει μόνο του τη σελίδα και το APK.
echo  Σε 3-5 λεπτά η νέα έκδοση είναι live στη σελίδα και στην εφαρμογή.
echo.
echo  Πάτα ένα πλήκτρο για να ανέβει, ή κλείσε το παράθυρο για ακύρωση.
pause >nul

git add -A src tests scripts index.html package.json vite.config.js README.md PLAN.md "ΧΑΡΤΗΣ_ΚΑΤΑΔΥΣΗΣ.md" "ΑΝΕΒΑΣΜΑ.cmd"
if errorlevel 1 goto :fail

git commit -m "The dive map: 32 real and mythical places in 8 chapters" -m "Places at their real depths down to the Challenger Deep, myth and literature below it to the throne of Hades. A guardian for every place, six to eight creatures per chapter, two new weapons, six weapon evolutions, sea conditions, fixed slots, start from a reached chapter, resume a dive, the dive logbook. Gentler difficulty curve for an eight-chapter journey. The Supabase download link is retired." -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01QqheWwzETTKS5FBibLvVyu"
if errorlevel 1 goto :fail

git push origin main
if errorlevel 1 goto :fail

echo.
echo  ΕΤΟΙΜΟ. Ανέβηκε.
echo  Δες την πρόοδο εδώ:  https://github.com/bikakismanolis-rgb/abyssos/actions
echo  Το παιχνίδι:         https://bikakismanolis-rgb.github.io/abyssos/
echo.
pause
exit /b 0

:fail
echo.
echo  ΚΑΤΙ ΔΕΝ ΠΗΓΕ ΚΑΛΑ. Δεν ανέβηκε τίποτα ή ανέβηκε μισό.
echo  Αντίγραψε ό,τι γράφει από πάνω και στείλ' το στον Claude.
echo.
pause
exit /b 1
