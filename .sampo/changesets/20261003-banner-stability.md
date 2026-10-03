---
npm/@645/toss: patch
---

Place the generator banner before the attendance entry. Retain requested banner instances for up to one minute while their screen is inactive, reducing redundant reloads on quick returns while keeping SDK-managed refresh and impression tracking.

Keep a filled SDK banner visible when a refresh cannot fill or fails, and release inactive slots after the retention window. Unvisited placements and changed groups still wait for actual viewport entry before requesting an ad.
