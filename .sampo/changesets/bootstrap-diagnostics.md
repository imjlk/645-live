---
npm/@645/toss: patch
---

Add opt-in, identity-free server bootstrap stage timing through `TRAILBASE_BOOTSTRAP_TIMING=true`, defaulting to off. Preserve the existing internal auth origin, verified-account reuse, previous-secret recovery, and miniapp response contract. The TrailBase server must be redeployed before collecting timings; turn diagnostics off after a bounded measurement window.
