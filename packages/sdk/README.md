# `@645live/sdk`

JavaScript and TypeScript SDK for the public 645.live API.

## Install

```bash
npm install @645live/sdk
```

## Usage

```ts
import { create645LiveClient } from "@645live/sdk";

const client = create645LiveClient();

const recent = await client.getRecentDraws();
const stats = await client.getStatsOverview();
```

## Included methods

- `getRecentDraws()`
- `getDraw(round)`
- `getStatsOverview()`
- `getAuthProviders()`
- `getStatus()`
- `getOpenApiDocument()`

## Notes

- Default base URL: `https://645.live`
- Public read APIs are anonymous.
- Signed-in member workflows remain on the web app and MCP surfaces in Phase 1.
