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

Write-Host "=== IT Chronicles 0.18.3 build ===" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js was not found. Restart VSCodium or install Node.js LTS."
}

if (-not $env:JAVA_HOME) {
    $androidJbr = "C:\Program Files\Android\Android Studio\jbr"
    if (Test-Path "$androidJbr\bin\java.exe") {
        $env:JAVA_HOME = $androidJbr
        $env:Path = "$env:JAVA_HOME\bin;$env:Path"
    }
}

if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    throw "Java was not found. Check Android Studio and JAVA_HOME."
}

Write-Host "1/6 Installing dependencies..." -ForegroundColor Yellow

# Repair an incomplete or incompatible node_modules directory left from an older build.
$coreManifest = Join-Path $PSScriptRoot "node_modules\@capacitor\core\package.json"
$resetModules = $false
if (Test-Path (Join-Path $PSScriptRoot "node_modules")) {
    if (-not (Test-Path $coreManifest)) {
        $resetModules = $true
    } else {
        try {
            $installedCore = Get-Content $coreManifest -Raw | ConvertFrom-Json
            $installedVersion = [string]$installedCore.version
            if (-not $installedVersion.StartsWith("7.")) { $resetModules = $true }
        }
        catch {
            $resetModules = $true
        }
    }
}

if ($resetModules) {
    Write-Host "Incomplete dependencies were found. Cleaning node_modules..." -ForegroundColor Yellow
    Remove-Item (Join-Path $PSScriptRoot "node_modules") -Recurse -Force -ErrorAction SilentlyContinue
}

& npm.cmd install --legacy-peer-deps --no-audit --no-fund
if ($LASTEXITCODE -ne 0) {
    Write-Host "The first npm install failed. Performing a clean retry..." -ForegroundColor Yellow
    Remove-Item (Join-Path $PSScriptRoot "node_modules") -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $PSScriptRoot "package-lock.json") -Force -ErrorAction SilentlyContinue
    & npm.cmd cache verify | Out-Host
    & npm.cmd install --legacy-peer-deps --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed after a clean retry. Exit code: $LASTEXITCODE"
    }
}

Write-Host "Installed Capacitor versions:" -ForegroundColor DarkCyan
& npm.cmd list @capacitor/core @capacitor/android @capacitor/cli @capacitor/app --depth=0 | Out-Host
if ($LASTEXITCODE -ne 0) {
    throw "Capacitor dependencies are incomplete. Delete node_modules and run BUILD_UPDATE.bat again."
}

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
    $sdkForGradle = $androidSdk -replace '\\','/'
    [System.IO.File]::WriteAllText($localProperties, "sdk.dir=$sdkForGradle`n", (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "Android SDK: $androidSdk" -ForegroundColor Green
} elseif (-not (Test-Path ".\android\local.properties")) {
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
    $content = [regex]::Replace($content, 'versionCode\s+\d+', 'versionCode 1803')
    $content = [regex]::Replace($content, 'versionName\s+"[^"]+"', 'versionName "0.18.3"')
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

Write-Host "5/6 Stopping old Gradle process..." -ForegroundColor Yellow

Push-Location ".\android"
try {
    & .\gradlew.bat --stop | Out-Host

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
$releaseName = "Hroniki-Aytishnika-v0.18.3.apk"
$releaseApk = Join-Path $downloads $releaseName
Copy-Item $apk $releaseApk -Force

Write-Host ""
Write-Host "BUILD SUCCESSFUL" -ForegroundColor Green
Write-Host "Project APK: $apk" -ForegroundColor Cyan
Write-Host "Release APK: $releaseApk" -ForegroundColor Cyan
Start-Process explorer.exe "/select,`"$releaseApk`""
