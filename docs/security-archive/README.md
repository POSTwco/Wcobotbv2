# Security test archive (historical)

## Status

Production routing no longer mounts interactive pen-test pages.

Previously retained (unrouted) modules:

- `src/app/pages/security-audit.tsx` — IvyFi-style vector checklist (historical)
- `src/app/pages/security-pentest-user.tsx` — broader client-visible suite (historical)

Final recorded run referenced in routing comments: **2026-03-17**.

Those UIs were **snapshot tools**, not a continuous certification program. Results
age as code changes. Prefer live review of:

- Edge auth middleware (`requireAdminSession`, wallet session validation)
- Rate limits on vote / chat / applications
- Mirror-node wallet verification
- `SECURITY.md` residual risk register

## Why archived

- Reduce dead weight in the SPA source tree
- Avoid implying permanent “100% pass” status to Web3 auditors
- Keep security narrative honest and operator-focused

If re-running client-side harnesses is needed, restore from git history at the
commit that last contained those files and mount routes only on a **non-production**
build.
