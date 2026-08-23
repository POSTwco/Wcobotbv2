# Early Supporter — Security notes (live)

## What’s already solid
- Wallet session required (`X-Wallet-Session`) for claim/eligibility
- One-per-wallet: KV marker + Mirror ownership check
- Rate limits (IP + wallet)
- Treasury private key only in Supabase secrets (never `VITE_*`)
- Local mock claims only in Vite `DEV` + explicit flag
- Mint scripts use gitignored `scripts/hedera/.env.hedera`

## Hardening applied (post-launch pass)
- **No Edge mock claims** unless `EARLY_SUPPORTER_ALLOW_MOCK=true`
- **Global serial lock** around allocate → transfer → KV write
- **Treasury key pubkey must match** Mirror account key before signing
- Prefer `EARLY_SUPPORTER_TREASURY_PRIVATE_KEY` over operator fallback
- **Post-transfer ownership** best-effort verify on Mirror
- **Admin KV reset blocked** while `MINT_ENABLED` unless `ALLOW_KV_RESET`
- Client errors sanitized (no key/SDK dumps)

## Production secret checklist
| Secret | Prod value |
|--------|------------|
| `EARLY_SUPPORTER_ENABLED` | `true` |
| `EARLY_SUPPORTER_MINT_ENABLED` | `true` |
| `EARLY_SUPPORTER_ALLOW_MOCK` | **`false`** |
| `EARLY_SUPPORTER_DEBUG` | **`false`** |
| `EARLY_SUPPORTER_ALLOW_KV_RESET` | **`false`** |
| `EARLY_SUPPORTER_TREASURY_PRIVATE_KEY` | set (dedicated) |
| `EARLY_SUPPORTER_NFT_TOKEN_ID` | `0.0.10821256` |
| `EARLY_SUPPORTER_TREASURY_ACCOUNT_ID` | `0.0.10821146` |

## Residual risks (accepted)
- Mirror lag can delay post-transfer confirm (transfer still settled on HTS)
- In-memory `acquireLock` is per Edge isolate (KV + Mirror ownership still protect)
- Admin with DEBUG+ALLOW_KV_RESET could clear KV while user keeps NFT — keep both false
- Remaining unminted supply (~3.4k) not yet in treasury until you resume mint
