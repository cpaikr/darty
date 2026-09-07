# darty

한국 DART 공시를 검색하고 조회하는 읽기 전용 CLI 도구입니다. 사람과 에이전트 모두 `darty` 명령을 subprocess로 실행해 같은 기능을 사용할 수 있습니다.

Darty는 DART 공개 웹 화면을 읽기 전용으로 사용합니다. 공식 OpenDART API가 아니며, DART 웹 동작이 바뀌면 결과나 파서가 영향을 받을 수 있습니다.

## 설치

배포 경로는 [비공개 GitHub Releases](https://github.com/cpaikr/darty/releases)입니다.
저장소 접근 권한으로 로그인한 뒤 버전별 실행 파일 압축본, `SHA256SUMS`,
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

기본 설치 위치는 `%LOCALAPPDATA%\darty\bin`입니다. 이 폴더를 `PATH`에 추가하거나
`-BinDirectory`로 다른 위치를 지정하세요. 조직의 PowerShell 실행 정책이 스크립트를
제한한다면 해당 정책에 따라 스크립트를 검토·승인한 뒤 실행하세요.

업데이트도 새 릴리스의 파일들을 내려받아 같은 절차로 설치합니다. 체크섬 검증이나
새 실행 파일 확인에 실패하면 기존 실행 파일은 교체하지 않습니다. 설치 스크립트와
체크섬은 반드시 같은 인증된 릴리스에서 받으세요.

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

## 주의사항

- 이 도구는 DART 공개 웹 동작을 읽기 전용으로 사용합니다.
- DART의 공식 OpenDART API를 사용하는 패키지가 아닙니다.
- 투자, 회계, 법률 판단을 제공하지 않습니다.
- 결과를 중요한 의사결정에 사용할 때는 원문 DART 링크와 참조 정보를 직접 확인하세요.

## 개발 문서

- [제품 방향](VISION.md)
- [현재·후보·목표 아키텍처](ARCHITECTURE.md)
- [진행 중인 작업과 백로그](ROADMAP.md)
- [기능 및 전송 계약](docs/specs/README.md)

## 라이선스

Elastic License 2.0. 자세한 내용은 [`LICENSE.md`](./LICENSE.md)를 참조하세요.
