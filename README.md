# Receiva

Receiva helps suppliers turn buyer-approved invoices into working capital. A funder advances discounted USDG to the supplier, and the buyer repays the face value by the original due date. A partial buyer bond provides limited default coverage.

Built for Arbitrum Open House. This is a testnet prototype, with no legal debt enforcement or verified business identities.

## Run locally

Requires Node.js 22 and npm.

```sh
npm install
npm test
npm run build
npm run node
```

In another terminal:

```sh
npm run deploy:local
npm exec -w contracts -- hardhat run scripts/demo.ts --network localhost
npm run dev
```

Open http://127.0.0.1:3000. Local deployment writes the frontend environment file and mints clearly labelled mock tokens. Restart the web server after changing deployment configuration. Local Hardhat accounts are public development accounts, never fund them with real assets.

## Arbitrum Sepolia

Configure `contracts/.env` from `.env.example`. Keys stay local and must never be committed. Fund the project wallet with Arbitrum Sepolia ETH. Obtain official test USDG for the buyer and funder.

Paxos lists the token at `0xFFC95faa3d63Cde504a05B567C600B78C0b41892`, with six decimals verified through RPC. Source: https://docs.paxos.com/guides/stablecoin/usdg/testnet

```sh
npm run deploy:sepolia
npm exec -w contracts -- hardhat verify --network arbitrumSepolia HUB_ADDRESS USDG_ADDRESS
npm exec -w contracts -- hardhat run scripts/demo.ts --network arbitrumSepolia
npm run build
```

The deployment script refuses other networks. It records addresses and writes `apps/web/.env.local`. The demo uses 10 USDG face value, 9.8 advance and 1 bond, with two invoices. Supply at least 20 test USDG to each of the buyer and funder wallets. The script distributes test gas from the project wallet and records each broadcast transaction immediately. It refuses to overwrite existing evidence.

## Contract rules

- Draft: supplier can cancel, designated buyer can approve and post a bond.
- Approved: an unrelated funder can advance USDG before the funding deadline. After the deadline, anyone can expire the approval and return its bond.
- Funded: ownership cannot change and cancellation is forbidden.
- Settlement on or before the due date sends the face value to the funder and returns the bond.
- After the due date, anyone can mark default and pay the bond to the funder. The buyer can cure the remaining debt.
- Direct late settlement records both a default and a late repayment, consumes the bond and charges only the remainder.
- Each nonzero file hash can be registered once per supplier. Registration is scoped to the supplier so another wallet cannot squat on a supplier's hash. This is byte-level uniqueness within this contract, not a global duplicate-invoice guarantee.

No admin, fees, upgrades, arbitrary token selection after deployment or owner withdrawals. Uses OpenZeppelin SafeERC20 and ReentrancyGuard. Official USDG has issuer-controlled pause, freeze and upgrade powers outside Receiva’s control.

## Interface

Supplier invoice creation, local PDF hashing, buyer approval, funding market, settlement, local file comparison, buyer repayment history and event-backed receipts. Security Lab uses real RPC simulations and identifies them as simulations, without claiming a mined rejection transaction.

The ledger displays the latest 100 invoices. Detail pages can open older IDs. Timeline queries cover the last 50,000 blocks and link to the explorer for older history. An indexer is future work.

## Evidence

See `evidence/` for actual deployment, transaction and verification records. See `docs/demo-script.md` and `docs/submission.md` for presentation material. Missing evidence is pending, never fabricated.

## Limitations

Business identities are demo identities. Anyone can use a new wallet to reset its apparent repayment history. Hashes can be pre-registered by others and modified files can bypass exact-hash uniqueness. There is no KYB, credit underwriting, legal assignment, collection service or guarantee of principal. Contracts have not received an independent security audit.
