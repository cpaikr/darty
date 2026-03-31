# Filesystem Tool Playbook

Use [../contracts.md](../contracts.md) for shared contract rules and [../evaluation.md](../evaluation.md) for eval structure. This playbook covers what is specific to workspace and file operations.

## Goal

A filesystem tool for agents should not simply expose unrestricted shell power. It should provide safe, auditable, high-signal operations over a bounded workspace.

## Recommended Operation Families

### Discovery

- `list_directory`
- `search_paths`
- `stat_path`
- `tree_snapshot`

### Read

- `read_text`
- `read_json`
- `read_csv`
- `tail_file`
- `diff_files`

### Write

- `write_text`
- `apply_patch`
- `mkdir`
- `move_path`
- `copy_path`

### Safety and review

- `preview_write`
- `preview_move`
- `require_approval`
- `log_operation`

## Filesystem-Specific Requirements

- every operation should stay inside an allowed root or policy-defined boundary
- prefer semantic writes like `apply_patch` over arbitrary shell when possible
- keep read-only and mutating actions distinct at the contract level
- for writes, return affected paths, operation type, and diff summary

## Hard Cases

- path traversal attempts
- symlink escapes
- binary file confusion
- concurrent edits
- encoding problems
- destructive overwrites
