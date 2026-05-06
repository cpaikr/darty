# darty

한국 DART 공시를 검색하고 조회하는 Bun CLI입니다.

`darty`는 DART 검색/조회 화면을 읽기 전용 구조화 데이터로 사용할 수 있게 합니다. 현재 공개 버전은 `search-body`로 DART 공시 본문내용 검색을, `view-report`로 접수번호 기반 보고서 목차/섹션 조회를 지원합니다.

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

### `search-body`

DART 공시 본문내용을 검색하고 구조화된 JSON을 표준 출력으로 반환합니다.

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
- `--section-id <id>`: `view-report` 결과의 `toc[].id`. TOC가 있는 문서에서 선택한 목차 섹션을 조회할 때 사용합니다.
- `--output-format <html|markdown>`: 출력 형식. 기본값은 `markdown`입니다. `markdown`은 읽기 쉬운 best-effort 변환이며 복잡한 표는 HTML 태그로 보존합니다.
- `--max-bytes <숫자>`: 반환 본문 최대 바이트 수, 기본값 `200000`

동작:

- TOC가 있는 문서는 기본 호출에서 문서 목록과 목차만 반환합니다.
- `--section-id`를 지정하면 해당 섹션의 본문(`content.body`)과 이전/다음/상위 navigation을 반환합니다.
- TOC가 없는 문서는 `--section-id` 없이 기본 호출에서 선택 문서 본문(`content.body`)을 반환하고 warning을 포함합니다.
- 내부 DART viewer 파라미터(`dcmNo`, `eleId`, `offset`, `length`, `dtd`)는 공개 옵션으로 노출하지 않습니다.

## 참고

- 이 도구는 읽기 전용입니다.
- 현재 `search-body`는 DART `공시통합검색` 화면의 `본문내용` 검색 모드만 구현합니다. 회사명, 보고서명, 목차명, 고급검색 전체를 구현한 것은 아닙니다.
- `view-report`는 DART `dsaf001` viewer shell과 `/report/viewer.do` 본문 iframe 동작에 기반합니다.
- 공개 DART 웹 동작을 사용하므로 DART 변경의 영향을 받을 수 있습니다.
- 현재 공개 CLI는 의미 기반 옵션만 노출하며, 내부 DART 재현 필드는 CLI 계약에 포함하지 않습니다.
