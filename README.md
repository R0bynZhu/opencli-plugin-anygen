# opencli-plugin-anygen

AnyGen CLI — create docs, slides, videos from the terminal.

## Install

```bash
opencli plugin install github:R0bynZhu/opencli-plugin-anygen
```

## Commands

| Command | Strategy | Description |
|---------|----------|-------------|
| `anygen create` | UI | Create a new AnyGen document, slides, design, video, etc. |
| `anygen list` | UI | List recent AnyGen documents from your library |
| `anygen status` | Cookie | Show AnyGen credits and subscription status |

## Usage

```bash
# Create a slides presentation
opencli anygen create --prompt "AI 发展趋势" --type slides

# Create a document (default type)
opencli anygen create --prompt "quarterly report summary"

# Create with file attachments
opencli anygen create --prompt "summarize this" --files report.pdf,data.csv

# List recent documents
opencli anygen list --limit 5

# Check subscription status
opencli anygen status
```

## Development

```bash
# Install locally (symlinked, changes reflect immediately)
opencli plugin install file://$(pwd)

# Verify commands are registered
opencli anygen --help
```
