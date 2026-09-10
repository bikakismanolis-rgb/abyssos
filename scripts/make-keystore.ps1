# Creates the release signing key for Google Play and the git-ignored android\keystore.properties.
# Run once, from the project folder, in PowerShell:
#   .\scripts\make-keystore.ps1
# The password is typed hidden and is never printed or stored anywhere except keystore.properties.
# BACK UP android\abyssos-release.keystore AND the password: without them the app can never be updated.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$keystore = Join-Path $root 'android\abyssos-release.keystore'
$props = Join-Path $root 'android\keystore.properties'
$keytool = 'C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe'

if (Test-Path $keystore) {
  Write-Host "Υπάρχει ήδη: $keystore" -ForegroundColor Yellow
  Write-Host "Αν θέλεις καινούριο, σβήσε το πρώτο. Δεν πειράζω υπάρχον κλειδί."
  exit 1
}
if (-not (Test-Path $keytool)) { Write-Host "Δεν βρέθηκε το keytool στο $keytool"; exit 1 }

$p1 = Read-Host -AsSecureString 'Κωδικός για το κλειδί (τουλάχιστον 6 χαρακτήρες)'
$p2 = Read-Host -AsSecureString 'Ξανά τον ίδιο κωδικό'
$plain1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1))
$plain2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2))
if ($plain1 -ne $plain2) { Write-Host 'Οι κωδικοί δεν ταιριάζουν.' -ForegroundColor Red; exit 1 }
if ($plain1.Length -lt 6) { Write-Host 'Πολύ μικρός κωδικός.' -ForegroundColor Red; exit 1 }

& $keytool -genkeypair -v -keystore $keystore -alias abyssos -keyalg RSA -keysize 2048 -validity 10000 `
  -storepass $plain1 -keypass $plain1 -dname 'CN=skoros, O=skoros, C=GR' | Out-Null
if (-not (Test-Path $keystore)) { Write-Host 'Το keytool δεν έφτιαξε το κλειδί.' -ForegroundColor Red; exit 1 }

@(
  'storeFile=../abyssos-release.keystore',
  "storePassword=$plain1",
  'keyAlias=abyssos',
  "keyPassword=$plain1"
) | Set-Content -Path $props -Encoding ASCII

Write-Host ''
Write-Host "Έτοιμο. Κλειδί: $keystore" -ForegroundColor Green
Write-Host "Ρυθμίσεις:      $props" -ForegroundColor Green
Write-Host 'ΑΝΤΙΓΡΑΨΕ το αρχείο του κλειδιού και τον κωδικό σε ασφαλές μέρος εκτός υπολογιστή.' -ForegroundColor Yellow
