# darty

한국 DART 공시를 검색하고 조회하는 read-only CLI이자 reusable tool provider입니다.

## Surfaces

### CLI

이 패키지는 기존 `darty` CLI를 계속 제공합니다. npm/npx 환경에서는 Node.js 20.18.1 이상으로 실행되며, 소스 개발과 테스트는 Bun을 사용합니다. 명령과 옵션은 README에 복제하지 않습니다. 현재 사용법은 CLI help 메시지를 기준으로 확인하세요 (`--help`).

Command success and command failure both emit one JSON envelope to stdout. Help output remains human-readable.

### Neutral package API

Agent hosts should prefer the runtime-neutral toolset contract when integrating Darty without shelling out:

```ts
import { createDartyToolset } from "@sjunepark/darty/toolset";

const darty = createDartyToolset();
const operations = darty.listOperations();
const searchCompany = darty.getOperation("search-company");
const result = await darty.execute("disclosure-types", { query: "사업보고서" });
```

The neutral toolset is the canonical integration surface. It owns Darty operation names, JSON-schema input/result contracts, execution, result envelopes, references, warnings, metadata, and typed errors. Canonical operation names are not host-specific names: `search-body`, `search-company`, `search-company-reports`, `company-detail`, `company-rss`, `disclosure-types`, and `view-report`.

Package API stability policy:

- Operation names, input JSON schemas, top-level result envelope fields, and warning/error code meanings are reusable package contracts.
- Removing or renaming an operation, removing an input/result field, or changing a warning/error code meaning is a breaking package API change.
- Adding operations, optional input fields, result fields, warnings, or metadata is allowed in compatible releases.
- The current TypeScript API stays discovery-oriented (`execute(name, input)`). Strong operation-specific overloads are deferred until a TypeScript host needs them enough to justify maintaining public input/result type maps.
- The Pi adapter is intentionally structurally typed and does not import Pi runtime/dev types yet; package smoke tests cover the generated tool shape and cross-subpath behavior without making Pi a required dependency.

### Pi package/extension

The package also exposes a Pi adapter:

```bash
pi install npm:@sjunepark/darty
```

Pi receives progressive tools instead of one eager tool per Darty operation:

- `darty_list_operations`
- `darty_get_operation_details`
- `darty_run_operation`
- `darty_get_help`

The adapter wraps `createDartyToolset()` and keeps normal tool text concise while preserving full DART result envelopes, references, warnings, metadata, and typed errors in tool details.

DART 공개 웹 동작을 읽기 전용으로 사용하므로 DART 변경의 영향을 받을 수 있습니다.
