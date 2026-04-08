# opencli-plugin-anygen

AnyGen CLI — create docs, slides, videos

## Install

```bash
# From local development directory
opencli plugin install file:///private/tmp/opencli-plugin-anygen

# From GitHub (after publishing)
opencli plugin install github:<user>/opencli-plugin-anygen
```

## Commands

| Command | Type | Description |
|---------|------|-------------|
| `anygen/hello` | YAML | Sample YAML command |
| `anygen/greet` | TypeScript | Sample TS command |

## Development

```bash
# Install locally for development (symlinked, changes reflect immediately)
opencli plugin install file:///private/tmp/opencli-plugin-anygen

# Verify commands are registered
opencli list | grep anygen

# Run a command
opencli anygen hello
opencli anygen greet --name World
```
