# Windows installation and recovery

Use the [README installation procedure](../README.md#windows) for a normal
installation. This guide covers filesystem visibility and command discovery
when a Windows installation appears successful but `darty` cannot be found.
Release certification requirements belong in the [release runbook](release.md).

## Choose a visible installation directory

Prefer an independently launched PowerShell session over a shell spawned by a
packaged desktop app. MSIX apps can redirect `%LOCALAPPDATA%` writes to private
storage: a file may appear installed inside that process while an independent
terminal cannot see it at the advertised path.

The installer checks a temporary file's physical handle path before replacing
an existing executable. If the physical and advertised paths differ, it stops
and reports both paths. Do not add an invisible or redirected path to `PATH`.
Run the installer from an independent PowerShell session, or choose a directory
that is not redirected.

The default `%LOCALAPPDATA%\darty\bin` is suitable in a normal independent
PowerShell session. `%USERPROFILE%\.local\bin` was verified as a recovery
location for the observed redirection case; it is not required on every Windows
system. To choose it explicitly:

```powershell
$DartyBin = "$env:USERPROFILE\.local\bin"
.\install.ps1 -Archive ".\darty-<version>-win32-x64.tar.gz" -Checksums ".\SHA256SUMS" -BinDirectory $DartyBin
& "$DartyBin\darty.exe" --help
```

## Verify the file before changing PATH

Installation, visibility from another process, persistent user `PATH`, and the
current shell's `PATH` are separate checks. In an independent terminal, replace
`$DartyBin` with the actual directory passed to `-BinDirectory` (or the default
installation directory):

```powershell
$DartyBin = "$env:USERPROFILE\.local\bin"
$DartyExe = Join-Path $DartyBin "darty.exe"
$visible = Test-Path -LiteralPath $DartyExe -PathType Leaf
$visible
if (-not $visible) { throw "Not visible: $DartyExe" }
& $DartyExe --help
```

If `Test-Path` returns `False`, resolve the installation location or process
visibility first. Changing `PATH` cannot make that file visible.

## Add the directory to the user PATH

Set `$DartyBin` to the verified installation directory. This preserves existing
entries and avoids adding a duplicate, ignoring case and trailing backslashes.
It does not modify a PowerShell profile.

```powershell
$DartyBin = "$env:USERPROFILE\.local\bin"
$binKey = $DartyBin.TrimEnd("\")
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$userEntries = if ([string]::IsNullOrWhiteSpace($userPath)) { @() } else { @($userPath -split ";") }
$alreadyPresent = $false
foreach ($entry in $userEntries) {
    if ($entry.Trim().TrimEnd("\") -ieq $binKey) { $alreadyPresent = $true; break }
}
if (-not $alreadyPresent) {
    $separator = if ([string]::IsNullOrEmpty($userPath)) { "" } else { ";" }
    [Environment]::SetEnvironmentVariable("Path", "$userPath$separator$DartyBin", "User")
}
```

An already open PowerShell session keeps its inherited `PATH`. Open a new
terminal from a process with the updated environment, restarting the terminal
app if necessary, then run `Get-Command darty -CommandType Application` and
`darty --help`.

## Use the current PowerShell session

To check command discovery without restarting, update the current shell
separately. Use the same verified installation directory:

```powershell
$DartyBin = "$env:USERPROFILE\.local\bin"
$binKey = $DartyBin.TrimEnd("\")
$currentPath = $env:Path
$currentEntries = @($currentPath -split ";")
$alreadyPresent = $false
foreach ($entry in $currentEntries) {
    if ($entry.Trim().TrimEnd("\") -ieq $binKey) { $alreadyPresent = $true; break }
}
if (-not $alreadyPresent) {
    $env:Path = if ([string]::IsNullOrEmpty($currentPath)) { $DartyBin } else { "$DartyBin;$currentPath" }
}
Get-Command darty -CommandType Application
darty --help
```

`Get-Command` verifies command-name lookup. Calling the executable by its full
path verifies filesystem visibility independently of `PATH`.
