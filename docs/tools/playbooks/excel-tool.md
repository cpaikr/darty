# Excel Tool Playbook

Use [../contracts.md](../contracts.md) for shared contract rules and [../evaluation.md](../evaluation.md) for eval structure. This playbook only covers spreadsheet-specific design choices.

## Goal

Some DART workflows eventually end in spreadsheet-like data or exported statement tables. Expose workbook structure and table boundaries so the agent does not have to reverse-engineer them.

## Recommended Operations

- `inspect_workbook`
- `list_tables`
- `read_range`
- `read_table`
- `find_sheets`
- `profile_sheet`

## Spreadsheet-Specific Requirements

- preserve `sheet_name`, row and column indices, `cell_address`, display value, raw value, and useful type hints
- keep display values separate from normalized numbers and dates
- expose merged ranges and inferred header rows when they matter

## Good Agent-Facing Abstractions

- `extract_primary_table`
- `find_sheet_with_columns`
- `read_table_by_header_match`
- `summarize_workbook_layout`

## Hard Cases

- hidden sheets
- merged cells
- formulas with stale cached values
- locale-specific number and date formats
- multi-table sheets
