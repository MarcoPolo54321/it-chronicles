param([switch]$PrepareOnly)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Run-Command {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command,
        [Parameter(Mandatory = $true)]
        [string]$ErrorMessage
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$ErrorMessage Exit code: $LASTEXITCODE"
    }
}

$project = Get-Content -LiteralPath '.\package.json' -Raw -Encoding UTF8 | ConvertFrom-Json
$version = $project.version
$versionCode = $project.androidVersionCode
Write-Host "=== IT Chronicles $version debug build ===" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js was not found. Restart VSCodium or install Node.js LTS."
}

if (-not $env:JAVA_HOME) {
    $androidJbr = "C:\Program Files\Android\Android Studio\jbr"
    if (Test-Path "$androidJbr\bin\java.exe") {
        $env:JAVA_HOME = $androidJbr
    }
}
if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    $env:Path = "$env:JAVA_HOME\bin;$env:Path"
}

if (-not $PrepareOnly -and -not (Get-Command java -ErrorAction SilentlyContinue)) {
    throw "Java was not found. Check Android Studio and JAVA_HOME."
}

Write-Host "1/6 Installing dependencies..." -ForegroundColor Yellow

Run-Command { npm.cmd ci --no-audit --no-fund } "Dependency installation failed."

if (-not (Test-Path ".\android\gradlew.bat")) {
    Write-Host "2/6 Android platform not found. Creating it..." -ForegroundColor Yellow
    Run-Command { npm.cmd run android:add } "Capacitor Android platform creation failed."
} else {
    Write-Host "2/6 Android platform already exists." -ForegroundColor Green
}

# Restore Android SDK location for newly unpacked projects.
$androidSdk = $env:ANDROID_SDK_ROOT
if (-not $androidSdk) { $androidSdk = $env:ANDROID_HOME }
if (-not $androidSdk -and $env:LOCALAPPDATA) {
    $candidateSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    if (Test-Path $candidateSdk) { $androidSdk = $candidateSdk }
}
if ($androidSdk -and (Test-Path $androidSdk)) {
    $env:ANDROID_HOME = $androidSdk
    $env:ANDROID_SDK_ROOT = $androidSdk
    $localProperties = Join-Path $PSScriptRoot "android\local.properties"
    $sdkForGradle = (Resolve-Path -LiteralPath $androidSdk).Path.Replace('\', '/')
    $sdkForGradle = [regex]::Replace($sdkForGradle, '[^\x00-\x7F]', { param($match) '\u{0:x4}' -f [int][char]$match.Value })
    [System.IO.File]::WriteAllText($localProperties, "sdk.dir=$sdkForGradle`n", (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "Android SDK: $androidSdk" -ForegroundColor Green
} elseif (-not $PrepareOnly -and -not (Test-Path ".\android\local.properties")) {
    throw "Android SDK was not found. Install Android Studio or set ANDROID_SDK_ROOT."
}

Write-Host "3/6 Synchronizing web files..." -ForegroundColor Yellow
Run-Command { npm.cmd run android:sync } "Capacitor synchronization failed."

Write-Host "4/6 Installing application icons..." -ForegroundColor Yellow
$iconRoot = Join-Path $PSScriptRoot "resources\android-icons"
$resourceRoot = Join-Path $PSScriptRoot "android\app\src\main\res"
$densities = @(
    "mipmap-mdpi",
    "mipmap-hdpi",
    "mipmap-xhdpi",
    "mipmap-xxhdpi",
    "mipmap-xxxhdpi"
)

foreach ($density in $densities) {
    $source = Join-Path $iconRoot $density
    $target = Join-Path $resourceRoot $density
    New-Item -ItemType Directory -Force -Path $target | Out-Null

    Get-ChildItem $target -Filter "ic_launcher*" -ErrorAction SilentlyContinue |
        Remove-Item -Force -ErrorAction SilentlyContinue

    Copy-Item (Join-Path $source "ic_launcher.png") (Join-Path $target "ic_launcher.png") -Force
    Copy-Item (Join-Path $source "ic_launcher_round.png") (Join-Path $target "ic_launcher_round.png") -Force
}

$adaptiveIcons = Join-Path $resourceRoot "mipmap-anydpi-v26"
if (Test-Path $adaptiveIcons) {
    Get-ChildItem $adaptiveIcons -Filter "ic_launcher*.xml" -ErrorAction SilentlyContinue |
        Remove-Item -Force -ErrorAction SilentlyContinue
}

$gradleFile = ".\android\app\build.gradle"
if (Test-Path $gradleFile) {
    $content = [System.IO.File]::ReadAllText((Resolve-Path $gradleFile))
    $content = [regex]::Replace($content, 'versionCode\s+\d+', "versionCode $versionCode")
    $content = [regex]::Replace($content, 'versionName\s+"[^"]+"', "versionName `"$version`"")
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Resolve-Path $gradleFile), $content, $utf8NoBom)
}

$gradleProperties = ".\android\gradle.properties"
if ((Test-Path $gradleProperties) -and
    -not (Select-String -Path $gradleProperties -Pattern '^org\.gradle\.vfs\.watch=false$' -Quiet)) {
    [System.IO.File]::AppendAllText(
        (Resolve-Path $gradleProperties),
        [Environment]::NewLine + "org.gradle.vfs.watch=false" + [Environment]::NewLine
    )
}

Write-Host "5/6 Running tests..." -ForegroundColor Yellow
Run-Command { npm.cmd test } "Game tests failed."
if ($PrepareOnly) {
    Write-Host "Android project prepared in .\android" -ForegroundColor Green
    return
}

Push-Location ".\android"
try {
    Write-Host "6/6 Building APK..." -ForegroundColor Yellow
    Run-Command {
        .\gradlew.bat assembleDebug --no-daemon --no-watch-fs
    } "Gradle build failed."
}
finally {
    Pop-Location
}

$apk = Join-Path $PSScriptRoot "android\app\build\outputs\apk\debug\app-debug.apk"

if (-not (Test-Path $apk)) {
    throw "Build finished, but the APK file was not found. Check the Gradle output."
}

$downloads = $null
try {
    $downloadsKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders"
    $downloadsName = "{374DE290-123F-4565-9164-39C4925E467B}"
    $downloads = Get-ItemPropertyValue -Path $downloadsKey -Name $downloadsName -ErrorAction Stop
    $downloads = [Environment]::ExpandEnvironmentVariables($downloads)
}
catch {
    $downloads = Join-Path $env:USERPROFILE "Downloads"
}

New-Item -ItemType Directory -Force -Path $downloads | Out-Null
$debugApk = Join-Path $downloads "Hroniki-Aytishnika-v$version-debug.apk"
Copy-Item $apk $debugApk -Force

Write-Host ""
Write-Host "BUILD SUCCESSFUL" -ForegroundColor Green
Write-Host "Project APK: $apk" -ForegroundColor Cyan
Write-Host "Debug APK: $debugApk" -ForegroundColor Cyan
