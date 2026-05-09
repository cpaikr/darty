# darty

한국 DART 공시를 검색하고 조회하는 Bun CLI입니다.

`darty`는 DART 검색/조회 화면을 읽기 전용 구조화 데이터로 사용할 수 있게 합니다. 현재 공개 버전은 `search-body`로 DART 공시 본문내용 검색을, `search-company`로 DART 기업개황 회사별 검색을, `search-company-reports`로 회사 코드 기반 공시 목록 검색을, `company-detail`로 기업개황 상세 조회를, `company-rss`로 회사별 공시 RSS 조회를, `view-report`로 접수번호 기반 보고서 목차/섹션 조회를 지원합니다.

## 필요 사항

- [Bun](https://bun.sh/)

## 빠른 시작

설치 없이 실행:

```bash
bunx @sjunepark/darty search-body \
  --keyword 배당 \
  --start-date 20250331 \
  --end-date 20260331
```

전역 설치 후 실행:

```bash
bun add -g @sjunepark/darty

darty search-body \
  --keyword 배당 \
  --start-date 20250331 \
  --end-date 20260331
```

## 명령

기본 출력은 에이전트 사용을 위해 공백을 줄인 JSON입니다. 사람이 읽을 때는 각 명령에 `--pretty`를 추가하세요. CLI 기본 출력은 전체 capability 스키마의 compact projection입니다. 검색 계열 명령의 파서 검증용 `evidence`와 섹션 조회의 반복 목차 같은 진단/출처 필드는 기본 출력에서 생략되며, 필요하면 `--verbose`를 추가하세요.

### `company-detail`

DART 8자리 회사 코드로 기업개황 상세 정보를 조회합니다.

```bash
darty company-detail --company-code <8자리 DART 회사 코드>
```

예시:

```bash
darty company-detail --company-code 00126380
```

### `company-rss`

DART 8자리 회사 코드로 회사별 공시 RSS를 조회합니다.

```bash
darty company-rss --company-code <8자리 DART 회사 코드>
```

예시:

```bash
darty company-rss --company-code 00126380
```

### `search-company`

DART 기업개황의 `회사별` 검색으로 DART 회사 고유코드(8자리, `companyCode`)를 찾습니다. DART가 표시하는 경우 6자리 종목코드(`stockCode`)도 확인할 수 있습니다. 상세 정보와 RSS는 각각 `company-detail`, `company-rss`로 조회합니다.

```bash
darty search-company --company-name <회사명>
```

선택 옵션:

- `--page <숫자>`: 검색 결과 페이지, 기본값 `1`
- `--page-size <숫자>`: 한 페이지에 요청할 회사 수, 기본값 `15`, 최대 `45`

예시:

```bash
darty search-company --company-name 삼성전자
```

### `search-company-reports`

DART 8자리 회사 코드로 공시통합검색의 회사별 공시 목록을 조회합니다. 회사명을 알고 회사 코드를 모르면 먼저 `search-company`로 `companyCode`를 확인하세요.

```bash
darty search-company-reports --company-code <8자리 DART 회사 코드> --start-date <YYYYMMDD> --end-date <YYYYMMDD>
```

선택 옵션:

- `--page <숫자>`: 검색 결과 페이지, 기본값 `1`
- `--page-size <15|30|50|100>`: 한 페이지에 요청할 공시 수, 기본값 `15`
- `--sort-direction <asc|desc>`: 접수일자 정렬 방향, 기본값 `desc`
- `--presenter-name <텍스트>`: 제출인명
- `--report-name <텍스트>`: 보고서명
- `--disclosure-type <코드>`: 공시유형 상세 코드. 여러 코드는 옵션을 반복해서 지정합니다. 예: `A001`, `I001`
- `--industry-code <코드>`: DART 업종 코드, 기본값 `all`
- `--corporation-type <all|P|A|N|E>`: 법인유형, 기본값 `all`. `P`=유가증권시장, `A`=코스닥시장, `N`=코넥스시장, `E`=기타법인
- `--closing-accounts-month <all|01-12>`: 결산월, 기본값 `all`
- `--include-all-reports`: 기본 최종보고서 필터를 해제하고 정정 전 보고서까지 포함합니다.

예시:

```bash
darty search-company-reports \
  --company-code 00190321 \
  --start-date 20250507 \
  --end-date 20260507
```

### `search-body`

DART 공시 본문내용을 검색합니다.

```bash
darty search-body --keyword <검색어> --start-date <YYYYMMDD> --end-date <YYYYMMDD>
```

필수 옵션:

- `--keyword <검색어>`: 본문내용 검색어. DART 공통 검색 문법을 그대로 사용할 수 있습니다: `사과 포도`=AND, `사과|포도`=OR, `사과!포도`=NOT, `"사과 포도"`=정확한 구문.
- `--start-date <YYYYMMDD>`: 검색시작일
- `--end-date <YYYYMMDD>`: 검색종료일

선택 필터:

- `--page <숫자>`: 검색 결과 페이지, 기본값 `1`
- `--sort-by <date|reportName>`: 정렬 기준, 기본값 `date`
- `--sort-direction <asc|desc>`: 정렬 방향, 기본값 `desc`
- `--company-code <텍스트>`: 회사명/종목코드
- `--presenter-name <텍스트>`: 제출인명
- `--report-name <텍스트>`: 보고서명

명령 도움말 보기:

```bash
darty search-body --help
```

### `view-report`

DART 접수번호 또는 viewer URL로 보고서 문서 목록/목차를 확인하고, 필요한 목차 섹션만 정제된 HTML 또는 best-effort Markdown으로 반환합니다.

```bash
darty view-report --receipt <접수번호-or-viewer-url>
```

섹션 조회:

```bash
darty view-report --receipt 20260331004166 --section-id section:5.6
```

필수 옵션:

- `--receipt <접수번호-or-viewer-url>`: DART 접수번호 또는 `/dsaf001/main.do?rcpNo=...` viewer URL. URL에 `dcmNo`가 있으면 해당 문서 선택에 내부적으로 사용합니다.

선택 옵션:

- `--document-id <id>`: `view-report` 결과의 `documents[].id`. 생략하면 기본 본문 문서입니다.
- `--section-id <id>`: `view-report` 결과의 `toc[].id`. TOC가 있는 문서에서 선택한 목차 섹션을 조회할 때 사용합니다. 섹션 ID는 보고서별로 새로 부여되므로 연도, 정정, 다른 접수번호의 보고서에 재사용하지 말고 매 보고서에서 목차를 먼저 조회하세요.
- `--output-format <html|markdown>`: 출력 형식. 기본값은 `markdown`입니다. `markdown`은 읽기 쉬운 best-effort 변환이며 복잡한 표는 HTML 태그로 보존합니다.
- `--max-bytes <숫자>`: 반환 본문 최대 바이트 수, 기본값 `50000`. 크게 지정하면 긴 섹션의 출력과 에이전트 context 사용량이 커질 수 있습니다.
- `--verbose`: `--section-id` 섹션 본문 조회 출력에도 문서 목록과 목차를 포함합니다.
- `--toc-depth <숫자>`: 목차를 지정한 깊이까지만 출력합니다. 섹션 본문 조회에서는 목차 포함도 함께 켭니다.
- `--pretty`: 사람이 읽기 쉬운 들여쓰기 JSON으로 출력합니다.

동작:

- TOC가 있는 문서는 기본 호출에서 문서 목록과 목차만 반환합니다.
- `--section-id`를 지정하면 해당 섹션의 본문(`content.body`)과 이전/다음/상위 navigation을 반환합니다. CLI 출력은 기본적으로 반복되는 전체 문서 목록과 목차를 생략합니다.
- 섹션 본문과 TOC 없는 문서 본문은 길 수 있습니다. 에이전트 context 부담을 줄이려면 먼저 목차만 확인하고 필요한 섹션만 조회하며, `--toc-depth`로 목차 출력을 줄이고 `--max-bytes`는 필요한 만큼만 키우세요.
- TOC가 없는 문서는 `--section-id` 없이 기본 호출에서 선택 문서 본문(`content.body`)을 반환하고 warning을 포함합니다.
- 내부 DART viewer 파라미터(`dcmNo`, `eleId`, `offset`, `length`, `dtd`)는 공개 옵션으로 노출하지 않습니다.

## 참고

- 이 도구는 읽기 전용입니다.
- 현재 `search-company`는 DART `기업개황` 화면의 `회사별` 회사명 검색만 구현합니다. `업종별`, 사업자등록번호, 법인등록번호 검색은 구현하지 않았습니다.
- 현재 `search-company-reports`는 DART `공시통합검색` 화면의 `회사명` 모드를 8자리 회사 코드로 실행합니다. 회사명 입력/팝업 선택과 다중 회사 선택은 구현하지 않았습니다.
- 현재 `search-body`는 DART `공시통합검색` 화면의 `본문내용` 검색 모드만 구현합니다. 보고서명, 목차명, 고급검색 전체를 구현한 것은 아닙니다.
- `view-report`는 DART `dsaf001` viewer shell과 `/report/viewer.do` 본문 iframe 동작에 기반합니다.
- 공개 DART 웹 동작을 사용하므로 DART 변경의 영향을 받을 수 있습니다.
- 현재 공개 CLI는 의미 기반 옵션만 노출하며, 내부 DART 재현 필드는 CLI 계약에 포함하지 않습니다.
