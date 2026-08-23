# Early Supporter NFT Claim (Phase 1)

Local-first free claim system. **Real HTS minting is disabled by default.**

## Local testing (`pnpm run dev`)

Add to `.env.local` (gitignored):

```
VITE_EARLY_SUPPORTER_ENABLED=true
VITE_EARLY_SUPPORTER_LOCAL_MOCK=true
VITE_EARLY_SUPPORTER_TREASURY_ACCOUNT_ID=0.0.10821146
```

1. Restart Vite after changing env.
2. Connect HashPack or Magic on `/wallet/assets`.
3. Claim the Early Supporter NFT (mock — localStorage).
4. Confirm it appears with thumbnail + video; counter increments.
5. Second claim → rejected.
6. Refresh → claim persists.
7. Use **Reset local claim** (dev mock only) to reclaim.

Local mock key: `localStorage["wco:early-supporter:v1"]`.

## Production safety

| Flag | Default | Meaning |
|------|---------|---------|
| `VITE_EARLY_SUPPORTER_ENABLED` | `false` | Hide claim UI |
| `VITE_EARLY_SUPPORTER_LOCAL_MOCK` | `false` (dev-only when true) | Browser mock |
| `EARLY_SUPPORTER_ENABLED` (Edge) | `false` | Block Edge claim writes |
| `EARLY_SUPPORTER_MINT_ENABLED` (Edge) | `false` | No on-chain mint |

Do **not** enable Edge claim on www until staging is verified. Prefer local mock for localhost so production KV is never written during UI work.

## Treasury

Mint-source account (public): `0.0.10821146`.

## Phase 2 (real mint)

1. Create HTS NFT (supply 5000) under treasury.
2. Set token IDs + migrate media to **public** Storage/IPFS URLs.
3. Implement `mintEarlySupporterHts` with isolated operator secrets (never `VITE_*`).
4. Enable mint on WCO-Resolver first, then www.
