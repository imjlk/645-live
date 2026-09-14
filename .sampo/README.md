# Miniapp releases

The release package is `npm/@645/toss`. Keep a changeset in `.sampo/changesets/` for changes shipped in the miniapp:

```md
---
npm/@645/toss: patch
---

Describe the visible change.
```

Run `bunx sampo release --dry-run` to inspect the next version. After main passes CI, Sampo opens or refreshes `release/toss`. Merging that release PR publishes a `645-live-vX.Y.Z` GitHub release and uploads the matching production `.ait` bundle to Apps in Toss. The package remains private and is never published to npm.

`AIT_API_KEY` is the app-scoped Apps in Toss deployment key stored in GitHub Actions secrets. Use **AIT release → Run workflow**, selecting an existing release tag, to retry an upload. Build and upload evidence stays in the workflow artifacts. Console review requests and public release remain separate from CLI bundle uploads.

The release PR keeps main’s dependency resolutions and updates only the miniapp workspace version in `bun.lock`; dependency upgrades belong in their own reviewed changes. Enable GitHub Actions to create pull requests in the repository workflow permissions. Main CI is checked before releasing, and the generated release PR receives an explicit CI dispatch.
