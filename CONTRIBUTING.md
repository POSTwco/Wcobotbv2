# Contributing to WCO Platform

Thank you for helping keep Battle of the Bars / WCO Platform solid. This is a
**proprietary** production codebase (see `LICENSE`). External contributions are
by invitation unless otherwise announced.

## Ground rules

1. **Local green before push** — `pnpm install` and `pnpm build` must succeed.
2. **No secrets** — never commit `.env`, private keys, treasury material, or session tokens.
3. **Wallet & admin are high-risk** — changes to:
   - `src/app/lib/wallet-connect.ts`
   - `src/app/components/wallet-context.tsx`
   - Admin challenge-sign / session code
   - Vote / wallet-session edge routes  
   require explicit review and extra testing. Prefer separate PRs/commits.
4. **Edge source of truth** — production deploy target is  
   `supabase/functions/make-server-57fcb0ee` (`pnpm deploy:edge`). Keep `server/` in sync if you edit either.
5. **Honest security language** — no “unhackable” or perpetual “100% pen test” claims in docs.

## Setup

```bash
pnpm install
pnpm dev          # Vite dev server
pnpm build        # Production build + SEO assets
pnpm preview      # Preview dist/ locally
```

Optional: `pnpm typecheck` when TypeScript project references are configured.

## Commit style

Prefer conventional, boring commits:

- `feat(cali): …`
- `fix(admin): …`
- `chore: remove unused dependency`
- `docs: update SECURITY.md`

Avoid dumping unrelated refactors with product fixes.

## Reporting security issues

See [SECURITY.md](./SECURITY.md). Do not file public issues with exploit details.
