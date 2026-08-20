# Magic Create Account — WCO onboarding

Additive dual-path wallet onboarding for **Battle of the Bars / WCO** only.  
HashPack / WalletConnect **Quick Connect remains fully intact**.

## Paths

| Path | Who | How |
|------|-----|-----|
| **Create New Account** | New users | Magic email OTP / Google / Apple → sponsored Hedera `AccountCreate` |
| **Connect Existing Wallet** | Returning / crypto-native | HashPack via WalletConnect (unchanged) |

Feature flag: `VITE_MAGIC_ENABLED=true` (default off until secrets are set).

## Frontend env (Vite)

```bash
VITE_MAGIC_ENABLED=true
VITE_MAGIC_PUBLISHABLE_KEY=pk_live_...
VITE_HEDERA_NETWORK=mainnet   # or testnet — must match Magic extension + operator
```

Install packages (if not already):

```bash
npm install magic-sdk @magic-ext/hedera
# Optional for Google/Apple popup OAuth:
# npm install @magic-ext/oauth
```

## Edge secrets (Supabase — never Vite)

```bash
MAGIC_SECRET_KEY=sk_live_...
MAGIC_ACCOUNT_CREATE_ENABLED=true
HEDERA_OPERATOR_ID=0.0.xxxxx
HEDERA_OPERATOR_KEY=...          # pays AccountCreate fee only
HEDERA_NETWORK=mainnet           # or testnet
```

**v1 does not send starter HBAR** — only sponsors account creation.

## Magic dashboard checklist

1. Create Magic app; copy publishable + secret keys.
2. Enable **Email OTP**.
3. Enable **Google** and **Apple** OAuth redirect URIs for `https://www.wcorg.io` (and staging).
4. Set Hedera network to match production (`mainnet` or `testnet`).

## API routes (additive)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/wallet/magic/ensure-account` | Validate DID + create/lookup Hedera account |
| POST | `/wallet/magic/register` | Issue `X-Wallet-Session` for Magic users |
| POST | `/wallet/register` | **Unchanged** HashPack WC topic register |

## Signing & votes

- Context routes `signMessage` by `walletProvider` (`hashpack` | `magic`).
- Magic accounts are typically **ECDSA**. Vote verification accepts ECDSA via session-bound wallet-approval (same trust model as cali/elite gates). ED25519 HashPack path unchanged.

## Key export

WCO never stores private keys. Advanced users can reveal/export via Magic’s user UI and import into HashPack later.

## Rollout

1. Deploy edge with secrets; keep `VITE_MAGIC_ENABLED=false`.
2. Smoke test on staging (testnet operator).
3. Enable `VITE_MAGIC_ENABLED=true` on prod after ECDSA vote smoke + AccountCreate success.
4. Monitor `[MAGIC]` edge logs and vote ECDSA approvals.

## Rollback

Set `VITE_MAGIC_ENABLED=false` and/or `MAGIC_ACCOUNT_CREATE_ENABLED=false`. Connect falls back to HashPack-only.
