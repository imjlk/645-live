# `@645live/cli`

Official CLI for the public 645.live API.

## Install

```bash
npm install -g @645live/cli
```

## Usage

```bash
645live recent
645live draw 1221
645live stats
645live auth
645live status
```

## Options

- `--json`: print the raw JSON payload
- `--base-url <url>`: use a different 645.live-compatible endpoint

## Notes

- Default base URL: `https://645.live`
- Public read APIs are anonymous.
- Signed-in member workflows remain on the web app and MCP surfaces in Phase 1.
