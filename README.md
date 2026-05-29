# darty

한국 DART 공시를 검색하고 조회하는 읽기 전용 CLI 도구입니다. 사람과 에이전트 모두 `darty` 명령을 subprocess로 실행해 같은 기능을 사용할 수 있습니다.

Darty는 DART 공개 웹 화면을 읽기 전용으로 사용합니다. 공식 OpenDART API가 아니며, DART 웹 동작이 바뀌면 결과나 파서가 영향을 받을 수 있습니다.

## 공개 통합 표면

권장 기본 표면은 `darty` CLI입니다. 사람, subprocess를 실행하는 에이전트, Creo desktop처럼 프로세스 경계가 필요한 호스트는 CLI를 사용하세요.

신뢰할 수 있는 JS/TS 서버 호스트는 `@sjunepark/darty/toolset`을 사용할 수 있습니다. 이 표면은 Darty를 같은 서버 런타임 안에서 실행해야 하는 호스트를 위한 transport-neutral 도구 계약입니다.

Pi 어댑터나 Pi 전용 패키지 export는 제공하지 않습니다.

## 설치

```bash
npm install @sjunepark/darty
```

CLI를 바로 실행하려면 다음처럼 사용할 수 있습니다.

```bash
npx @sjunepark/darty --help
```

npm/npx 환경에서는 Node.js 20.18.1 이상이 필요합니다. 이 저장소의 개발, 테스트, 빌드는 Bun을 사용합니다.

## CLI

기존 `darty` 명령을 계속 제공합니다.

```bash
darty --help
darty search-body --keyword 배당 --start-date 20250331 --end-date 20260331
```

명령과 옵션의 최신 기준은 CLI 도움말입니다. README에는 전체 옵션을 복제하지 않습니다.

```bash
darty <command> --help
```

대부분의 조회 명령은 성공과 실패를 모두 표준 출력의 JSON 응답 객체로 출력합니다. `report-guide`와 도움말 출력은 사람이 읽기 쉬운 텍스트로 유지됩니다.

현재 제공하는 주요 작업은 다음과 같습니다.

- `search-body`: 공시 본문 내용 검색
- `search-company`: DART 회사 코드 검색
- `search-company-reports`: 회사별 공시 목록 검색
- `company-detail`: 회사 상세 정보 조회
- `company-rss`: 회사별 공시 RSS 조회
- `disclosure-types`: 공시상세유형 코드 조회
- `report-guide`: 필요한 정보가 어떤 DART 보고서에 있는지 안내하는 Markdown 가이드 출력
- `view-report`: 보고서 목차 또는 본문 조회

## CLI 통합 계약

CLI 도움말이 현재 명령, 옵션, 입력 제약, 출력 동작의 기준입니다.

```bash
darty --help
darty <command> --help
```

정상 조회 명령은 표준 출력에 단일 JSON 응답 객체를 출력합니다. 실패도 표준 출력에 단일 JSON 실패 객체를 출력하고 non-zero로 종료합니다. 진행 로그와 디버그 진단은 표준 에러를 사용해 stdout JSON 파싱을 방해하지 않습니다.

## JS/TS 서버 toolset

서버 호스트에서 subprocess wrapper 없이 Darty 기능을 실행해야 한다면 toolset export를 import하세요.

```ts
import { createDartyToolset } from "@sjunepark/darty/toolset";

const darty = createDartyToolset();
const validation = darty.validateInput("search-company", { companyName: "삼성전자" });

if (validation.ok) {
  const result = await darty.execute("search-company", validation.input);
}
```

toolset은 명령 discovery/help, 입력 검증, source-owned serialized errors, `AbortSignal` 취소를 제공합니다. 신뢰할 수 없는 플러그인이나 로컬 데스크톱 경계에는 CLI subprocess 계약을 선호하세요.

## 주의사항

- 이 도구는 DART 공개 웹 동작을 읽기 전용으로 사용합니다.
- DART의 공식 OpenDART API를 사용하는 패키지가 아닙니다.
- 투자, 회계, 법률 판단을 제공하지 않습니다.
- 결과를 중요한 의사결정에 사용할 때는 원문 DART 링크와 참조 정보를 직접 확인하세요.

## 라이선스

Elastic License 2.0. 자세한 내용은 [`LICENSE.md`](./LICENSE.md)를 참조하세요.
