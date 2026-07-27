# Connect-to-Enter Contest v1 — Ops Runbook

## Summary

- **Goal:** 5,000 unique eligible wallets
- **Main prizes:** $150 / $75 / $25 ($250)
- **Social prize:** $100 (share workout on X via CaliShareProof)
- **Eligibility:** WalletConnect session + ≥1 HBAR (server mirror check)
- **Privacy:** Full wallets admin-only; never publish public wallet lists

## Status machine

`draft` → `open` → `full` | `closed` → `drawing` → `completed`

- Auto `full` when entry count hits cap
- Admin can force `closed` / `drawing` / `completed`

## Admin workflow

1. Deploy edge + frontend with contest code (`status` defaults to `draft`).
2. In Admin → **Contest**, review config, set status **open**.
3. Monitor metrics / daily series; export anytime for backup.
4. At cap or goal: set **drawing**, export final CSV for external picker.
5. Record winners **only** in Contest tab (never paste full wallets into public posts).
6. Public announcement: prizes + “winners selected” copy only.
7. Winners log in; update status `claimed` → `paid` with payout ref.
8. Set **completed**.

## Export columns (picker)

```
entryNumber,accountId,enteredAt,hbarTinybarsAtEntry,socialQualified,socialQualifiedAt,lastLoginAt,termsVersion
```

Use social-qualified filter export for the $100 draw.

## Security notes

- Entry requires `X-Wallet-Session`
- Export requires admin session; every download is audited
- Public `/contest/public-stats` returns counts only
