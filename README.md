# darty

한국 DART 공시를 검색하는 Bun CLI입니다.

`darty`는 DART 검색 화면을 읽기 전용 구조화 데이터로 사용할 수 있게 합니다. 현재 공개 버전은 `contents-search` 명령으로 DART 공시 본문내용 검색을 지원합니다.

## 필요 사항

- [Bun](https://bun.sh/)

## 빠른 시작

설치 없이 실행:

```bash
bunx @sjunepark/darty contents-search \
  --keyword 배당 \
  --start-date 20250331 \
  --end-date 20260331
```

전역 설치 후 실행:

```bash
bun add -g @sjunepark/darty

darty contents-search \
  --keyword 배당 \
  --start-date 20250331 \
  --end-date 20260331
```

## 명령

### `contents-search`

DART 공시 본문내용을 검색하고 구조화된 JSON을 표준 출력으로 반환합니다.

```bash
darty contents-search --keyword <검색어> --start-date <YYYYMMDD> --end-date <YYYYMMDD>
```

필수 옵션:

- `--keyword <검색어>`: 본문내용 입력값
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
darty contents-search --help
```

## 참고

- 이 도구는 읽기 전용입니다.
- 공개 DART 웹 검색 동작을 사용하므로 DART 변경의 영향을 받을 수 있습니다.
- 현재 공개 CLI는 의미 기반 옵션만 노출하며, 내부 DART 재현 필드는 CLI 계약에 포함하지 않습니다.
