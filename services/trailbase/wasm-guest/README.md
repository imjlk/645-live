# TrailBase WASM Guest (645.live)

This package hosts the TrailBase WASM runtime component for custom APIs and jobs.

## Commands

- `npm run build`
  - builds the WASM component and deploys it to `../traildepot/wasm/component.wasm`
- `npm run dev`
  - starts TrailBase with hot-reload (SIGHUP) and watches `src`

## Notes

- Route add/remove requires server restart.
- Existing legacy V8 scripts in `../traildepot/scripts` are kept for rollback history.
