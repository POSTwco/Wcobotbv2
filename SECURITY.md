# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| Latest  | :white_check_mark: |

---

## Reporting a Vulnerability

If you discover a security vulnerability in **WCO Battle of the Bars**, please report it responsibly.

**Do not** create a public GitHub issue for security problems.

**Please email us instead:**

📧 **wrappdex@gmail.com**

Include the following information:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (if known)

We will acknowledge your report within 48 hours and aim to resolve critical issues as quickly as possible.

---

## Security Best Practices (for contributors)

- Never commit private keys, seeds, or real `VITE_WC_PROJECT_ID` values
- All sensitive values must stay in `.env` files (already ignored by `.gitignore`)
- Use environment variables for configuration
- Follow the existing code style and security patterns in `hedera-config.ts`

---

## Scope

This policy covers the WCO Battle of the Bars frontend and any Supabase Edge Functions.

Thank you for helping keep **Battle of the Bars** secure! 💪