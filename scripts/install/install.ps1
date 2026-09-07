# Download this installer, your archive, and SHA256SUMS from the same private release.
param(
    [Parameter(Mandatory=$true)][string]$Archive,
    [Parameter(Mandatory=$true)][string]$Checksums,
    [string]$BinDirectory = (Join-Path $env:LOCALAPPDATA 'darty\bin')
)
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne 'Win32NT' -or
    [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString() -ne 'X64') {
    throw 'This installer requires Windows x64.'
}
$Archive = (Resolve-Path -LiteralPath $Archive).Path
$archiveName = '@@WINDOWS_ARCHIVE@@'
if ([IO.Path]::GetFileName($Archive) -ne $archiveName) { throw "Expected $archiveName for this host." }
$matches = @(Get-Content -LiteralPath $Checksums | Where-Object { $_ -match ('^[0-9a-f]{64}  ' + [regex]::Escape($archiveName) + '$') })
if ($matches.Count -ne 1) { throw 'Missing or duplicate archive checksum.' }
$expected = $matches[0].Substring(0, 64)
if ((Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) {
    throw 'Archive checksum mismatch; existing installation was not changed.'
}
$entries = @(& tar -tzf $Archive)
if ($LASTEXITCODE -ne 0 -or ($entries -join "`n") -ne "darty.exe`nLICENSE.md") { throw 'Unexpected archive contents.' }
$types = @(& tar -tvzf $Archive)
if ($LASTEXITCODE -ne 0 -or @($types | Where-Object { -not $_.StartsWith('-') }).Count -ne 0) { throw 'Archive must contain only regular files.' }
$null = New-Item -ItemType Directory -Path $BinDirectory -Force
$BinDirectory = (Resolve-Path -LiteralPath $BinDirectory).Path
$stage = Join-Path $BinDirectory ('.darty-install-' + [Guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $stage
try {
    & tar -xzf $Archive -C $stage
    if ($LASTEXITCODE -ne 0) { throw 'Archive extraction failed.' }
    $candidate = Join-Path $stage 'darty.exe'
    & $candidate --help | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Candidate CLI failed; existing installation was not changed.' }
    $destination = Join-Path $BinDirectory 'darty.exe'
    if (Test-Path -LiteralPath $destination) {
        [IO.File]::Replace($candidate, $destination, $null)
    } else {
        [IO.File]::Move($candidate, $destination)
    }
    Write-Output "Installed darty @@VERSION@@ to $destination"
    Write-Output "Add $BinDirectory to PATH if needed."
} finally {
    Remove-Item -LiteralPath $stage -Recurse -Force
}
