# Create Hedera testnet accounts (manual)

These steps create **public** account IDs. Keep private keys offline.

## Option A — HashPack

1. Install HashPack browser extension.  
2. Create or import a wallet.  
3. Switch network to **Testnet**.  
4. Create a dedicated **Treasury (test)** account if needed.  
5. Fund via [Hedera testnet faucet](https://portal.hedera.com/) (link account / request HBAR).  
6. Copy **Account ID** only (`0.0.x`) into your ops sheet.

## Option B — Hedera Portal

1. Open https://portal.hedera.com/  
2. Create testnet account; download credentials **once** into password manager.  
3. Never commit the downloaded file.  
4. Fund with test HBAR.

## Recommended testnet roles

| Role | Purpose |
|------|---------|
| Treasury | Holds Admin NFTs; signs proposals |
| Operator (optional) | HCS submit fees if operator mode |
| Governor test | Holds test Governor NFT for vote smoke |
| Multisig shares A/B/C | Topic admin / NFT transfer 2-of-3 (offline) |

## Next

Fill `scripts/hedera/.env.hedera` from `.env.hedera.example` (local only), then run create scripts in order `01` → `04`.
