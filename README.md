# darty

한국 DART 공시를 검색하고 조회하는 읽기 전용 CLI 도구입니다. 사람과 에이전트 모두 `darty` 명령을 subprocess로 실행해 같은 기능을 사용할 수 있습니다.

Darty는 DART 공개 웹 화면을 읽기 전용으로 사용합니다. 공식 OpenDART API가 아니며, DART 웹 동작이 바뀌면 결과나 파서가 영향을 받을 수 있습니다.

여덟 작업을 Rust SDK, Node SDK, CLI가 같은 Rust 구현으로 제공합니다.
현재 배포 버전은 [v0.6.1](https://github.com/cpaikr/darty/releases/tag/v0.6.1)이며,
v0.6.0 CLI는 이전 Bun/TypeScript 구현입니다.
향후 작업은 [로드맵](ROADMAP.md)에서 확인하세요.

## 설치

배포 경로는 [공개 GitHub Releases](https://github.com/cpaikr/darty/releases)입니다.
로그인 없이 버전별 실행 파일 압축본, `SHA256SUMS`,
운영체제에 맞는 설치 스크립트를 내려받으세요. Node.js, npm, Bun, 소스 빌드,
GitHub CLI는 필요하지 않습니다.

아래 절차는 실행 파일 압축본과 설치 스크립트를 제공하는 v0.6.0 이상에
적용됩니다. 이전 npm 배포는 갱신하지 않습니다.

| 실행 환경 | `<target>` | 설치 스크립트 |
|---|---|---|
| Linux GNU x64 | `linux-x64-gnu` | `install.sh` |
| Linux GNU ARM64 | `linux-arm64-gnu` | `install.sh` |
| macOS Apple Silicon | `darwin-arm64` | `install.sh` |
| Windows x64 | `win32-x64` | `install.ps1` |

모든 실행 파일은 Linux에서 빌드합니다. CI 실행 검증은 Linux에서만 수행하며,
macOS와 Windows 압축본은 교차 빌드 결과입니다. Linux 압축본은 Alpine/musl용이 아닙니다.

macOS/Linux에서는 같은 릴리스의 `darty-<version>-<target>.tar.gz`,
`SHA256SUMS`, `install.sh`를 같은 폴더에 내려받은 뒤 실행하세요.

```sh
sh install.sh "darty-<version>-<target>.tar.gz" SHA256SUMS
"$HOME/.local/bin/darty" --help
```

`<version>`과 `<target>`을 내려받은 파일 이름에 맞게 바꾸세요. 설치 스크립트는
현재 운영체제와 아키텍처를 확인하고 SHA-256을 검증한 뒤 실행 파일을 설치합니다.
`$HOME/.local/bin`을 `PATH`에 추가하면 어디서나 `darty`로 실행할 수 있습니다.
세 번째 인자로 다른 설치 디렉터리를 지정할 수 있습니다.

Windows에서는 `darty-<version>-win32-x64.tar.gz`, `SHA256SUMS`,
`install.ps1`을 내려받고 PowerShell에서 실행하세요. Windows의 기본 `tar`를 사용합니다.

```powershell
.\install.ps1 -Archive ".\darty-<version>-win32-x64.tar.gz" -Checksums ".\SHA256SUMS"
& "$env:LOCALAPPDATA\darty\bin\darty.exe" --help
```

가능하면 설치 스크립트는 패키지된 데스크톱 앱에서 생성한 셸이 아닌, 별도로 실행한
일반 PowerShell 세션에서 실행하세요. MSIX 앱은 `%LOCALAPPDATA%` 쓰기를 앱의
private storage로 redirect할 수 있습니다. 그러면 설치 프로세스 안에서는 성공한
것처럼 보여도 독립적인 터미널에서는 광고된 전체 경로의 파일이 보이지 않습니다.
PowerShell installer는 이제 임시 파일의 physical handle path를 확인하고 이런 경우
기존 실행 파일을 바꾸기 전에 광고된 경로와 physical path를 함께 표시하며 중단합니다.

기본 설치 위치는 `%LOCALAPPDATA%\darty\bin`이며, 일반적인 독립 PowerShell에서는
지원되는 위치입니다. 패키지된 실행 환경에서 이 문제가 발생하면 그 환경의 경로를
`PATH`에 추가하지 말고, 독립적인 PowerShell에서 다시 설치하거나 redirect되지 않는
사용자 지정 위치를 지정하세요. 이 사례에서 확인된 복구 위치는
`%USERPROFILE%\.local\bin`입니다. 모든 Windows 환경에서 이 위치가 필수라는 뜻은
아닙니다.

```powershell
$bin = "$env:USERPROFILE\.local\bin"
.\install.ps1 -Archive ".\darty-<version>-win32-x64.tar.gz" -Checksums ".\SHA256SUMS" -BinDirectory $bin
& "$bin\darty.exe" --help
```

설치, 파일 visibility, 영구 `PATH`, 현재 셸의 `PATH`는 서로 다른 단계입니다. 먼저
실제 선택한 디렉터리의 전체 경로를 확인하세요. `Test-Path`가 여기서 `False`이면
`PATH` 문제가 아니라 해당 프로세스에서 설치 위치가 보이지 않는 문제입니다.

```powershell
# -BinDirectory에 넘긴 실제 디렉터리로 바꾸세요.
$DartyBin = "$env:USERPROFILE\.local\bin"
$DartyExe = Join-Path $DartyBin "darty.exe"
$visible = Test-Path -LiteralPath $DartyExe -PathType Leaf
$visible
if (-not $visible) { throw "Not visible: $DartyExe" }
& $DartyExe --help
```

사용자 `PATH`에 선택한 디렉터리를 영구적으로 한 번만 추가하려면 다음을 실행하세요.
기존 항목은 보존하고, 같은 디렉터리의 끝 `\`만 무시하여 중복 추가를 피합니다.
이 명령은 profile을 수정하지 않습니다.

```powershell
# -BinDirectory에 넘긴 실제 디렉터리로 바꾸세요.
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

현재 열려 있는 PowerShell은 시작할 때 물려받은 `PATH`를 계속 사용합니다. 새 터미널을
열거나, 재시작하지 않고 현재 셸에서만 확인하려면 아래를 별도로 실행하세요. 이후
`Get-Command`는 명령 이름 검색을, 전체 경로 호출은 파일 visibility를 확인합니다.

```powershell
# -BinDirectory에 넘긴 실제 디렉터리로 바꾸세요.
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

조직의 PowerShell 실행 정책이 스크립트를 제한한다면 해당 정책에 따라 스크립트를
검토·승인한 뒤 실행하세요.

업데이트도 새 릴리스의 파일들을 내려받아 같은 절차로 설치합니다. 체크섬 검증이나
새 실행 파일 확인에 실패하면 기존 실행 파일은 교체하지 않습니다. 설치 스크립트와
체크섬은 반드시 이 저장소의 같은 릴리스에서 받으세요.

## CLI

사람과 에이전트는 같은 `darty` 명령과 JSON 프로세스 계약을 사용합니다.

```bash
darty --help
darty search-body --keyword 배당 --start-date 20250331 --end-date 20260331
```

명령, 옵션, 입력 제약, 출력 동작의 최신 기준은 CLI 도움말입니다. README에는
전체 옵션을 복제하지 않습니다.

```bash
darty <command> --help
```

대부분의 조회 명령은 성공과 실패를 모두 표준 출력의 단일 JSON 응답 객체로
출력합니다. 실패는 non-zero로 종료하고, 진행 로그와 진단은 표준 에러를
사용합니다. 검색 계열의 `--agent` 모드는 후속 호출에 필요한 식별자와 출처를
유지하면서 더 작은 JSON과 `help[]` 힌트를 출력합니다. `report-guide`와 도움말은
사람이 읽기 쉬운 텍스트로 유지됩니다.

현재 제공하는 주요 작업은 다음과 같습니다.

- `search-body`: 공시 본문 내용 검색
- `search-company`: DART 회사 코드 검색
- `search-company-reports`: 회사별 공시 목록 검색
- `company-detail`: 회사 상세 정보 조회
- `company-rss`: 회사별 공시 RSS 조회
- `disclosure-types`: 공시상세유형 코드 조회
- `report-guide`: 필요한 정보가 어떤 DART 보고서에 있는지 안내하는 Markdown 가이드 출력
- `view-report`: 보고서 목차 또는 본문 조회

## 에이전트 스킬

CLI 사용을 안내하는 소비자용 소스 패키지는 [`skill/darty`](skill/darty/SKILL.md)에
있습니다. 회사·공시 검색부터 보고서 섹션 확인과 출처 제시까지 안내하며,
실행 파일 설치가 필요할 때만 설치 문서를 읽도록 구성했습니다.

이 저장소에서 `skill/darty` 디렉터리 전체를 에이전트가 지원하는 스킬 설치
위치로 복사하세요. `references/`와 `agents/`도 함께 포함해야 합니다.
설치된 스킬은 DART 회사·공시 검색이나 보고서 조회 요청에 자동으로 적용할 수
있으며, `$darty`로 명시적으로 호출할 수도 있습니다. 실행 파일은 위 설치
절차로 별도 설치합니다.
저장소에 스킬 소스가 있다는 사실은 릴리스 아티팩트 배포나 로컬 등록을
뜻하지 않습니다.

## SDK와 로컬 개발

저장소의 Rust SDK는 [`crates/darty`](crates/darty/), 비동기 Node SDK는
[`packages/node`](packages/node/)에 있습니다. 두 SDK와 CLI가 같은 Rust 구현을
사용합니다. Node SDK는 Node.js 22.12.0 이상이 필요합니다.

SDK는 GitHub Release의 `.crate`와 플랫폼별 Node `.tgz`로 배포합니다.
Node 대상은 Linux GNU x64와 macOS Apple Silicon이며, tarball 안에 네이티브
애드온을 포함합니다. npm 레지스트리 배포나 CLI 런처는 제공하지 않습니다.
설치·버전 계약과 플랫폼별 검증 범위는 [배포 문서](docs/release.md)가
관리합니다. CLI 설치에는 Node SDK가 필요하지 않습니다.

로컬 개발 환경에서는 의존성을 설치하고 Rust 실행 파일을 빌드합니다.

```sh
bun install
bun run build
./target/release/darty --help
```

Bun은 개발·검증 도구에만 사용합니다. Rust 도구 모음 1.88.0이 필요하며,
실행 검증이 끝나지 않은 플랫폼을 지원 완료로 해석하지 마세요.

## 주의사항

- 이 도구는 DART 공개 웹 동작을 읽기 전용으로 사용합니다.
- DART의 공식 OpenDART API를 사용하는 패키지가 아닙니다.
- 투자, 회계, 법률 판단을 제공하지 않습니다.
- 결과를 중요한 의사결정에 사용할 때는 원문 DART 링크와 참조 정보를 직접 확인하세요.

## 개발 문서

- [제품 방향](VISION.md)
- [구현 및 배포 아키텍처](ARCHITECTURE.md)
- [진행 중인 작업과 백로그](ROADMAP.md)
- [기능 및 전송 계약](docs/specs/README.md)

## 라이선스

Elastic License 2.0. 자세한 내용은 [`LICENSE.md`](./LICENSE.md)를 참조하세요.
