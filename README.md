# darty

한국 DART 공시를 검색하고 조회하는 읽기 전용 도구입니다. 사람은 CLI로, 에이전트나 다른 런타임은 재사용 가능한 툴셋 API로 같은 기능을 사용할 수 있습니다.

Darty는 DART 공개 웹 화면을 읽기 전용으로 사용합니다. 공식 OpenDART API가 아니며, DART 웹 동작이 바뀌면 결과나 파서가 영향을 받을 수 있습니다.

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

명령 성공과 실패는 모두 표준 출력에 하나의 JSON 응답 객체로 출력됩니다. 도움말 출력은 사람이 읽기 쉬운 텍스트로 유지됩니다.

현재 제공하는 주요 작업은 다음과 같습니다.

- `search-body`: 공시 본문 내용 검색
- `search-company`: DART 회사 코드 검색
- `search-company-reports`: 회사별 공시 목록 검색
- `company-detail`: 회사 상세 정보 조회
- `company-rss`: 회사별 공시 RSS 조회
- `disclosure-types`: 공시상세유형 코드 조회
- `view-report`: 보고서 목차 또는 본문 조회

## 툴셋 API

셸 명령을 호출하지 않고 Darty를 통합하려면 런타임 중립 툴셋 API를 사용하세요.

```ts
import { createDartyToolset } from "@sjunepark/darty/toolset";

const darty = createDartyToolset();

const help = darty.help();
const operations = darty.listOperations();
const searchCompany = darty.getCommandHelp("search-company");
const prepared = darty.validateInput("disclosure-types", { query: "사업보고서" });
const result = prepared.ok
  ? await darty.execute("disclosure-types", prepared.input)
  : prepared.error;
```

이 API가 Darty의 표준 통합 지점입니다. 작업 이름, 소스/명령 도움말, JSON Schema 기반 입력/결과 계약, 네트워크 없는 입력 검증/정규화, 실행, 응답 객체, 참조 정보, 경고, 메타데이터, 타입화된 오류를 이 계층에서 관리합니다.

호스트 앱이 `darty(action, command?, inputJson?)` 같은 CLI형 단일 도구를 만들 때는 Darty의 `help()`, `getCommandHelp(name)`, `validateInput(name, input)`, `execute(name, input)`, `serializeError(error)`를 사용하세요. `validateInput`에는 파싱된 JSON 값을 그대로 전달하면 Darty가 최상위 입력 형태와 명령별 매개변수를 함께 검증/정규화합니다. 검증 실패는 `code`, `parameter`, `reason`, `expected`, `actual`, `message`, `recoveryHint`, `exampleInput`을 보존합니다. 실행 오류를 호스트/번들러 경계 밖으로 넘길 때는 `serializeDartyError(error)` 또는 `toolset.serializeError(error)`로 `code`, `retryable`, `parameter`, `sourceUrl`, `recoveryHint`, `operationName`, `message`를 구조적으로 보존할 수 있습니다.

표준 작업 이름은 특정 호스트나 어댑터에 종속되지 않습니다.

- `search-body`
- `search-company`
- `search-company-reports`
- `company-detail`
- `company-rss`
- `disclosure-types`
- `view-report`

## 패키지 API 안정성

재사용 가능한 패키지 계약으로 보는 범위는 다음과 같습니다.

- 작업 이름
- 소스/명령 도움말 필드
- 입력 JSON Schema
- 검증 실패 필드와 오류 코드의 의미
- 최상위 응답 객체 필드
- 경고와 오류 코드의 의미

작업을 제거하거나 이름을 바꾸는 변경, 입력/결과 필드를 제거하는 변경, 경고/오류 코드의 의미를 바꾸는 변경은 호환성을 깨는 변경입니다.

작업 추가, 선택 입력 필드 추가, 결과 필드 추가, 경고 추가, 메타데이터 추가는 호환 가능한 변경입니다.

현재 TypeScript API는 `execute(name, input)` 중심의 발견 가능한 형태를 유지합니다. 작업별 강한 타입 오버로드는 실제 TypeScript 호스트에서 유지 비용을 감수할 만큼 필요해질 때 추가합니다.

## Pi 패키지/확장

Pi에서는 다음처럼 설치할 수 있습니다.

```bash
pi install npm:@sjunepark/darty
```

Pi 어댑터는 하나의 도구만 노출합니다.

```ts
import { createDartyPiTool } from "@sjunepark/darty/pi";

const dartyTool = createDartyPiTool();
```

Pi SDK 호스트는 이 도구를 그대로 전달할 수 있습니다.

```ts
await createAgentSession({
  customTools: [dartyTool],
  tools: ["darty"],
});
```

모델이 보는 호출 형태는 `darty(action, command?, inputJson?)`입니다. 지원 action은 `help`, `command_help`, `validate`, `run`이며, command는 표준 Darty 작업 이름을 사용합니다. 이 어댑터는 내부에서 `createDartyToolset()`을 감싸며, 모델용 content에 도움말, 검증 피드백, 실행 결과, 참조, 경고, 메타데이터를 포함하고 전체 구조화 결과는 details에 보존합니다.

## 주의사항

- 이 도구는 DART 공개 웹 동작을 읽기 전용으로 사용합니다.
- DART의 공식 OpenDART API를 사용하는 패키지가 아닙니다.
- 투자, 회계, 법률 판단을 제공하지 않습니다.
- 결과를 중요한 의사결정에 사용할 때는 원문 DART 링크와 참조 정보를 직접 확인하세요.
