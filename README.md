## Chain‑Cred

### The  simplest and secured “digital loyalty card” .

No apps to install. No forms. No passwords. Just your wallet and your favorite shops.

---

### What is it?

- Chain‑Cred is a loyalty program like a punch card, but digital and fair.
- Your “points” are real tokens that live in your wallet (like Phantom).
- Any participating shop can give you points, and you can redeem them for rewards.

Think “Buy 9 coffees, get the 10th free” — but smarter, clearer, and yours to keep.

---

### Why it’s cool

- Your points belong to you: they’re in your wallet, not hidden in a company database.
- Transparent by default: every earn and redeem has a public receipt (a transaction link).
- Works across shops: one wallet can hold points from multiple businesses.
- Optional growth: points can increase over time if a business turns on “growth,” like interest.
- Fast and simple: actions feel like tapping a button; confirmations are quick.

---

### Who is it for?

- Customers who want loyalty points that are easy to use and impossible to “lose by accident.”
- Local businesses that want a simple, trustworthy reward system without heavy software.
- Neighborhoods and groups of brands that want to team up for shared rewards.

---

### How it works (real life)

- Customer
  - Open Chain‑Cred, pick your shop, and connect your wallet.
  - See your points balance and a small “growth over time” line (if the shop enables it).
  - Redeem with one click when you have enough points. You’ll see a confirmation and a link to your receipt.
  - There’s a QR of your wallet address so the cashier can scan and issue points at the counter.

- Merchant
  - Pick your business and connect your wallet.
  - Paste the customer’s wallet address (or scan the QR).
  - Click “Mint” to give points. You can also use a secure server button that mints points without you signing each time.
  - Safe‑by‑default controls: daily/transaction limits and duplicate‑click protection.

---

### What you need

- A wallet (like Phantom) on your phone or browser.
- A participating shop (or try the demo business).

No sign‑ups. No password resets. Your wallet is your key.

---

### Key features

- Earn points: issued by the shop to your wallet.
- Redeem rewards: transfer points to the shop’s redemption wallet with one click.
- Growth (optional): shops can enable a simple “APY‑style” growth so your points increase over time. This is clearly shown in the app.
- Multi‑business: switch shops from a dropdown; each can have its own reward list.
- Receipts: after any action, you get a link to a public receipt (the transaction) for peace of mind.

---

### Why it matters

- For customers
  - No surprise expirations.
  - Clear balances and receipts.
  - One wallet across many shops.

- For businesses
  - Higher repeat visits with a system people trust.
  - Fewer disputes (there’s always a receipt).
  - Easy setup; works alongside your current checkout.

- For communities
  - Shared promotions across neighboring shops are finally simple.
  - Loyalty becomes an open, friendly experience, not a walled garden.

---

### Safety and privacy

- We don’t ask for your name or email. Your wallet address is enough to earn and redeem.
- Points are tokens in your wallet. If you switch phones or laptops, just restore your wallet.
- Every action creates a public receipt so you and the shop can verify what happened.

---

### Common questions (quick)

- Do I need crypto experience?
  - No. Treat points like stamps—your wallet holds them, and buttons handle the rest.

- Can the shop change my balance?
  - They can issue you new points and receive redemptions, but your balance lives in your wallet and every change has a public receipt.

- What if I lose my phone?
  - Restore your wallet like you normally would; your points are still there.

- Is “growth” guaranteed?
  - Growth is optional and set by the business. If enabled, you’ll see it clearly. Shops can set caps and change the rate.

---


### Problem this solves

- Loyalty points live in closed databases, can expire without notice, and are hard to verify.
- SMBs lack a simple, affordable way to issue fair, fraud‑resistant loyalty.
- Cross‑brand (coalition) loyalty is hard because systems don’t interoperate.

Chain‑Cred issues loyalty as on‑chain tokens that customers actually own, with a lightweight merchant UI and auditable server APIs.

### Architecture (high level)

- Frontend: Next.js (App Router), React. Customer and Merchant pages are prerendered (static) for fast loads.
- APIs: Next.js server routes for minting, logs, rewards, and businesses. Heavy SDKs are dynamically imported to keep bundles small.
- Blockchain: Solana using SPL Token and optional Token‑2022 (Token Extensions) for advanced flows.
- Database: MongoDB (Mongoose) for API keys, idempotency, issuance logs, rate limits, and catalogs.

Flow: merchant mints tokens to a customer wallet → customer sees balance and redeems → server logs activity for auditability.

### Token model (SPL + Token‑2022)

- Each business has its own mint (SPL by default). Customers hold tokens in their wallet (Phantom/Solflare).
- Token‑2022 support: checked instructions and `TOKEN_2022_PROGRAM_ID` for ATAs/mints/transfers.
- Growth: UI can simulate an APY‑style increase. Future: move to Token‑2022 interest extension for on‑chain accrual.

Where in code: `src/lib/solana.js`, `src/app/api/mint/route.js` branch on Token‑2022.

### Security and safety

- API keys (SHA‑256 hashed), idempotency keys, per‑minute/day rate limits.
- Mint caps via env: `MINT_MAX_PER_TX`, `MINT_MAX_PER_DAY`.
- Client safeguards: wallet readiness checks, clear error handling, and non‑blocking UI toasts.

### Frontend UX

- Customer: connect wallet, pick business, see balance/growth, redeem, QR for POS.
- Merchant: connect wallet, pick business, paste/scan customer address, mint; or use server‑backed mint (API key).
- Admin: minimal logs and data views (extendable).

Wallets: Phantom, Solflare, optional Unsafe Burner (dev). We avoid wallet “aggregator” deps to stay lean.

### API endpoints (MVP)

- POST `/api/mint` — headers: `x-api-key`, optional `idempotency-key`, optional `x-biz-id`; body: `{ recipient, amount }`; returns `{ signature }`.
- GET `/api/businesses` — list configured businesses (mint, redemption wallet, flags).
- GET `/api/rewards?bizId=...` — reward catalog per business.
- POST `/api/redeem-log` — persist redemption metadata for audits.
- POST `/api/fund` — dev helper for small Devnet SOL transfers.

### Environment

Create `.env.local`:
```
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_USE_SERVER_MINT=true
NEXT_PUBLIC_TOKEN_2022=false
NEXT_PUBLIC_GROWTH_RATE=0.01

# Server‑only
MINT_AUTHORITY_SECRET_KEY=<base58 secret>
RPC_URL=https://api.devnet.solana.com
MINT_MAX_PER_TX=10
MINT_MAX_PER_DAY=100
MINT_PER_MINUTE=30
MINT_PER_DAY=1000
```

Data (MVP): `src/lib/businesses.json`, `src/lib/rewards.json`.

### Dev scripts

- `npm run create:mint` — create SPL mint (supports `KEYPAIR_PATH`, `DECIMALS`, `REVOKE_MINT=true`).
- `npm run create:mint2022` — create Token‑2022 mint (supports `INTEREST_APR`).
- `npm run gen:keypair` — generate local keypair JSON.

### Deployment (Vercel)

- Customer/Merchant pages are static; only APIs run as serverless functions.
- Dynamic imports minimize function size; `images.unoptimized` avoids sharp.
- Build‑time deps (Next/SWC/TypeScript) aren’t bundled into functions.
- Ensure devDependencies (Tailwind PostCSS) are installed at build time.

### Tools & libraries

- Next.js 15, React 19, Tailwind CSS 4
- @solana/web3.js, @solana/spl‑token (SPL + Token‑2022)
- Wallet Adapter (Phantom, Solflare, Unsafe Burner)
- MongoDB + Mongoose

### Roadmap

- On‑chain program (Anchor) for policy enforcement (caps, roles, allow‑lists).
- Admin console for catalogs, analytics, exports.
- POS integrations (QR cashier flow), coupons, campaigns.
- Token‑2022 interest/transfer hooks for fully on‑chain growth logic.

### References

- SPL Token: https://spl.solana.com/token
- Token‑2022: https://spl.solana.com/token-2022
- web3.js: https://github.com/solana-labs/solana-web3.js
- Wallet Adapter: https://github.com/solana-labs/wallet-adapter
- Next.js App Router: https://nextjs.org/docs/app
