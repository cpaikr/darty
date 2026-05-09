# TODO

## Search Company Reports UX

- Add a disclosure-type code discovery menu or helper. Check `https://github.com/sjunepark/open-dart/blob/85e7a07dee1d24cd810c705c1400c4ac3bbf6add/src/docs/pblntf_detail_ty.md` as source material.
- Expose each result item’s matched disclosure type/category when DART provides enough evidence, so repeated `--disclosure-type` searches are auditable.

## Later

- Add a discoverability path for `search-company-reports --industry-code` values. Users should not need to know DART 업종 codes like `612` ahead of time.
- Support XBRL views
- Consider semantic `view-report` content pagination/chunking for very large sections or TOC-less reports. Keep DART raw viewer params hidden; prefer a stable cursor or explicit content window contract.
