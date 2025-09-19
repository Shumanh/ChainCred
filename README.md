## Solana Loyalty — Multi‑Business On‑Chain Loyalty (Devnet)

A minimal but real multi‑business loyalty platform on Solana. Each business issues its own loyalty points as SPL/Token‑2022 tokens. Customers hold points in their wallets; merchants mint points and accept redemptions. The app ships with Customer and Merchant experiences, server‑secure minting, and a polished landing page.

### What’s included

- Customer app (`/customer`)
  - Connect wallet (Phantom/Solflare)
  - See balance per business, growth simulation (optional)
  - Burn points, Redeem to merchant wallet, Server Mint 1 (demo)
- Merchant app (`/merchant`)
  - Select business, connect wallet, paste customer address
  - Server‑secure mint (via `/api/mint` with API key)
- Multi‑business config (`src/lib/businesses.json`)
  - `id`, `name`, `mintAddress`, `merchantRedemption`, `token2022`
- Server APIs
  - `POST /api/mint` — mints from server authority (supports Token‑2022)
  - `POST /api/fund` — dev helper to send small Devnet SOL to users
- Landing page (`/`)
  - One‑screen hero with animations and CTAs to Customer/Merchant

### Why this is useful

- Tokenized points customers truly own (portable between channels/partners)
- Simple merchant UX for issuing points; transparent on‑chain redemptions
- Multi‑tenant from day one — one deployment, many businesses

### Environment

Create `.env.local`:

```
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_USE_SERVER_MINT=true # merchant mint via server route (recommended)
NEXT_PUBLIC_TOKEN_2022=false # set true if your mint is Token-2022
NEXT_PUBLIC_GROWTH_RATE=0.01 # optional, 1%/day simulated growth on dashboard

# Server-only (secure):
MINT_AUTHORITY_SECRET_KEY=<base58 secret key for backend minting>
RPC_URL=https://api.devnet.solana.com # optional server RPC, else falls back to NEXT_PUBLIC_RPC_URL
```

Per‑business config lives in `src/lib/businesses.json`:

```
[
  {
    "id": "dapp-coffee",
    "name": "Dapp Coffee",
    "mintAddress": "<SPL or Token-2022 mint>",
    "mintAuthority": "<optional public key for client-side mint>",
    "merchantRedemption": "<merchant redemption wallet>",
    "token2022": false
  }
]
```

### Create a Mint (Devnet)

Requires a funded Devnet keypair JSON.

```
npm run create:mint KEYPAIR_PATH=/absolute/path/keypair.json DECIMALS=0
```

Optionally revoke mint authority after setup by adding `REVOKE_MINT=true` to the command.

#### Token‑2022 (with Interest)

```
npm run create:mint2022 KEYPAIR_PATH=/absolute/path/keypair.json DECIMALS=0 INTEREST_APR=0.1
# then set NEXT_PUBLIC_TOKEN_2022=true and NEXT_PUBLIC_LOYALTY_MINT to the new mint
```

### Server mint authority

Set a backend mint authority in `.env.local` (never commit):

```
MINT_AUTHORITY_SECRET_KEY=<base58 secret key>
RPC_URL=https://api.devnet.solana.com # optional, server-side
```

Merchant page will call `/api/mint` when `NEXT_PUBLIC_USE_SERVER_MINT=true`.

### Multi‑business

- Edit `src/lib/businesses.json` to add businesses and their mints/redemption wallets.
- Customer and Merchant pages include a business dropdown.

### Run the App

```
npm run dev
```

- `http://localhost:3000/` — landing page (one‑screen hero)
- `http://localhost:3000/customer` — customer view: connect, balance, burn, redeem, server mint
- `http://localhost:3000/merchant` — merchant mint: mint tokens to any customer address

### Notes

- Built with Next.js (App Router), Tailwind CSS, `@solana/web3.js`, SPL Token, Wallet Adapter (Phantom/Solflare)
- No custom Anchor program yet. For production, consider moving business rules on‑chain (PDA/Anchor) and adding DB‑backed rate limits/logs.

### Quick Start (Devnet)

1) Install dependencies
```
npm i
```

2) Configure `.env.local` and `src/lib/businesses.json`

3) Run
```
npm run dev
```

4) Create dev mints (optional)
```
npm run create:mint KEYPAIR_PATH=/abs/path/id.json DECIMALS=0
# or Token‑2022
npm run create:mint2022 KEYPAIR_PATH=/abs/path/id.json DECIMALS=0 INTEREST_APR=0.1
```

### Roadmap (suggested)

- DB (Postgres) for logs, per‑business limits, exports
- Per‑business API keys & roles, admin filters/search
- Optional Anchor program for caps/allow‑lists on‑chain
- POS integrations (QR → wallet capture), receipts, branding
