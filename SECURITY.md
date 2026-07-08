# Security Policy — WCO Platform (Wcobotbv2)

This document describes how security is modeled on the WCO platform and lists
**known residual risks** for operators and auditors. It is written for Web3 and
application-security reviewers — not as a marketing claim of “unhackable” software.

## Scope

| Layer | Location | Notes |
|-------|----------|--------|
| Frontend SPA | `src/` · Vite/React · Vercel | UX, wallet connect UI, admin UI |
| Edge API | `supabase/functions/make-server-57fcb0ee/` | **Deployed** function (see `pnpm deploy:edge`) |
| Mirror copy | `supabase/functions/server/` | Keep in sync; **deploy target is `make-server-57fcb0ee`** |
| Chain | Hedera HTS + Mirror Node | Balances, NFT checks, account existence |

## Security model (summary)

1. **Wallet sessions** — After WalletConnect, clients register a server-issued wallet session token; privileged fan actions (votes, chat writes) require matching headers + server checks.
2. **Admin** — Challenge–sign–verify with admin wallet whitelist; short-lived server session (`X-Admin-Session` / equivalent). **Server `requireAdminSession` is authoritative.** Hiding the admin UI in React is not authorization.
3. **Cali / Elite** — Separate session tokens after wallet signature + eligibility checks (token/NFT/athlete flags as implemented server-side).
4. **Rate limiting** — Dual-layer limits on sensitive public endpoints (applications, votes, chat).
5. **Sensitive athlete fields** — Email/phone stripped from public athlete list/detail responses.
6. **Secrets** — Service-role / treasury keys must never ship in the frontend. The Supabase **anon** key in `utils/supabase/info.tsx` is public by design; protection is edge auth + storage policies, not key secrecy.

## Responsible disclosure

If you find a vulnerability:

1. **Do not** open a public GitHub issue with exploit details.
2. Contact WCO operators via official channels listed on [wcorg.io](https://www.wcorg.io) or the organization Discord/X accounts in the README.
3. Allow a reasonable window for remediation before public disclosure.

We welcome good-faith research that does not degrade live service (no spam voting, no DoS, no social engineering of athletes).

## Historical assessments

Unrouted pen-test UI modules previously lived under `src/app/pages/security-*.tsx` and documented historical attack-vector checks (2026-03). Those UIs are **not** continuous certification and are archived/removed from the production surface.

Do **not** treat README or badges as a guarantee of 100% residual risk free.

## Known residual risks (tracked — not all fixed in this repo pass)

> These are **documented for honesty**. Wallet and admin control flows are intentionally not rewritten in the hygiene pass; schedule dedicated remediations.

### High priority (product / ops)

| ID | Risk | Notes |
|----|------|--------|
| R1 | **Admin session tokens in `sessionStorage`** | XSS in the origin could exfiltrate a ~20‑minute admin session. Prefer memory-only sessions + strong CSP long-term. |
| R2 | **Edge deploy lag** | Frontend deploys from git; edge functions need `pnpm deploy:edge` (linked project). Mismatched deploys can leave API bugs live. |
| R3 | **Dual edge trees** | `server/` vs `make-server-57fcb0ee/` can drift. Always edit and deploy the deployed package. |

### Medium priority

| ID | Risk | Notes |
|----|------|--------|
| R4 | **Client `isAdmin` is UX only** | Must never be the sole gate for mutations (server already enforces — keep it that way). |
| R5 | **Public anon key in source** | Expected for Supabase; ensure no service role key, and storage buckets stay correctly scoped. |
| R6 | **Large client bundle** | ~5MB JS increases supply-chain and XSS impact surface; code-split later. |
| R7 | **Chat / vote / application surface** | Rate limits exist; ongoing abuse monitoring and pen tests recommended. |

### Lower priority / hygiene

| ID | Risk | Notes |
|----|------|--------|
| R8 | Verbose wallet logs in production builds | Prefer `import.meta.env.DEV` gating (incremental). |
| R9 | No Dependabot/CI audit yet | Add automated `pnpm audit` / dependency updates. |
| R10 | Over-strong marketing badges | Prefer precise claims (“challenge-sign admin”, “mirror-node checks”). |

## What this repo will not claim

- “Bank-grade” as a certification  
- “100% pen tested” as a permanent state  
- That client-side checks alone protect funds or admin actions  

Security is **defense in depth** + **ops discipline** (key custody, deploy process, monitoring).

## Operator checklist

- [ ] Never commit `.env`, treasury keys, or reward CSVs  
- [ ] Deploy edge after server changes: `pnpm deploy:edge`  
- [ ] Rotate admin wallets if compromise suspected  
- [ ] Keep HashPack / WC libraries updated with regression testing on connect + sign  
- [ ] Review CSP and dependency advisories on a schedule  

---

*Last updated: 2026-07-08 — hygiene & documentation pass.*
