# Revenue report refresh

The connected Apps in Toss console provides the source report. Request `iaa_placement_group_list` for workspace 17003 / miniapp 76048 with includeReport and refreshReportCache enabled. Query the last seven completed KST days. Save its group array to a private temporary JSON file, excluding unrelated groups if desired. Do not copy console cookies, API keys or session tokens into the app or repository.

Run a dry run, inspect the coverage, then apply the same snapshot and timestamp:

```sh
bun scripts/miniapp/ad-revenue-sync.mjs --input /private/report.json --start YYYY-MM-DD --end YYYY-MM-DD --fetched-at MILLISECONDS --ssh-target HOST --container CONTAINER
bun scripts/miniapp/ad-revenue-sync.mjs --input /private/report.json --start YYYY-MM-DD --end YYYY-MM-DD --fetched-at MILLISECONDS --ssh-target HOST --container CONTAINER --apply
```

Inside the deployed container the equivalent command is `bun /app/operations/ad-revenue-sync.mjs --database /app/traildepot/data/main.db --input - ...`. It requires the additive sync-status migration. Dry run is read-only. Apply validates the reviewed group-to-arm mapping and performs parameterized upserts plus the import status record in one transaction, with a five-second busy timeout. A failed transaction does not record a successful run. Old snapshots cannot replace newer data. The script has no public HTTP route and does not change campaigns, payouts, ad settings or functional ledgers.

Use the connected operator's scheduled task to fetch reports and run this command daily; the container does not possess a console login. Record the actual fetch timestamp, query dates and import summary. A missing/null report or omitted day remains unknown, never inferred as zero. Preserve existing rows when a later response omits them and use each group's oldest import time when interpreting partial refreshes. The import journal retains 90 days and records no raw report or personal identifiers.

Queries 23 and 24 show group coverage and oldest import time. Query 25 distinguishes purchase entry, SDK invocation, explicit cancellation and verified SDK completion (not settled sales). Query 26 diagnoses ad completion failures/retries. Query 28 shows the last successful import; over 36 hours without an import warrants inspection. Daily lack of ad impressions can legitimately leave missing report rows even when synchronization is healthy.

Before scheduling, deploy this revision, run the importer against the intended database in dry-run mode, apply one authorized report, and compare its daily/group sums with the console. For routine daily refreshes, notify only on operational failure, authentication loss, mismatched group mapping or prolonged stale collection; absent no-impression dates alone are not an incident.
