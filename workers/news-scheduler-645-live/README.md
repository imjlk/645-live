# News scheduler

Cloudflare Cron calls the existing `news-content.yml` workflow on `main` every Saturday at 21:21 and 22:21 KST. It is the only recurring trigger for news generation. The GitHub workflow accepts `workflow_dispatch` from this Worker or a manual run, generates missing MDX, pushes changes, and lets the Pages Git integration deploy them.

The Worker does not regenerate existing articles (`force=false`) or retry ambiguous dispatch requests. News and static-data jobs share a concurrency group with `queue: max` so a newly queued refresh cannot replace a pending news job.

## Credentials and deployment

- `GITHUB_ACTIONS_TOKEN`: a fine-grained GitHub token scoped to `imjlk/645-live`, with repository **Actions: read and write**. The production token has no expiration. Do not copy a general GitHub CLI login token into this Worker.
- `NEWS_RUN_TOKEN`: a separate randomly generated operator secret for manual checks. It grants access only to this Worker's fixed news dispatch route.

Use the package directory for these commands:

```sh
bun run check
bun run test
bun run deploy:dry-run
bunx wrangler whoami
bunx wrangler secret put GITHUB_ACTIONS_TOKEN
bunx wrangler secret put NEWS_RUN_TOKEN
bun run deploy
```

Enter secrets through Wrangler's prompt or stdin; do not put values in command arguments or version control. `.dev.vars` is ignored for local development. Production activation requires installing both secrets and deploying the Worker; merging this directory into `main` alone does not deploy the Worker.

`GET /health` reports configuration readiness. `POST /run`, authenticated with `Authorization: Bearer <NEWS_RUN_TOKEN>`, submits the same request as Cron. A `202` response means GitHub accepted the request, not that the article has been published. Check the returned run ID, Actions completion, and the Pages production deployment.

Cron changes may take up to 15 minutes to propagate. Local handler smoke checks use `bun run dev` and `GET /__scheduled` with test credentials and a stubbed outbound GitHub request. Never place production credentials in an unauthenticated local scheduled test endpoint.

References: [GitHub workflow dispatch](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event), [Cloudflare Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/).
