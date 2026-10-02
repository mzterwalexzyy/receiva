# Receiva, one-day implementation plan

Target: a working Arbitrum Sepolia invoice-financing submission on October 2, 2026.

## Current state

The workspace is empty. Node, npm and Git are available. Foundry is not on PATH. No deployment, tests or application exist yet.

## Scope and order

1. Implement and test the contract lifecycle before UI polish.
2. Build a minimal Next.js interface for supplier, buyer and funder actions.
3. Deploy on Arbitrum Sepolia, verify source and execute funded and defaulted examples.
4. Publish the frontend and assemble the demo and submission evidence.

Use Hardhat with TypeScript tests to avoid making a Foundry installation a dependency on this Windows machine. Keep Solidity contracts compatible with other toolchains. Use OpenZeppelin SafeERC20 and ReentrancyGuard, a fixed settlement token and no admin withdrawals or upgradeability.

## Contract decisions that resolve gaps in the supplied plan

- Cancellation is available only in Draft, as specified by cancelDraft. Approved invoices release the bond on expiry.
- Funding and approval require now < fundingDeadline. Expiry is permitted at now >= fundingDeadline.
- On-time settlement permits now <= dueDate. Default becomes available at now > dueDate. A late direct settlement must record a default and late repayment, so it cannot improve the on-time history merely because nobody marked default yet.
- Require 0 < bond < faceValue, consistent with the partial-bond scope, and 0 < advance < faceValue.
- Disallow supplier or buyer acting as funder for the demo's three-party model.
- Reject zero invoice hashes and duplicate hashes. Explain that byte-level uniqueness does not prevent altered copies, hash squatting or financing on another platform.
- USDG token decimals come from the actual deployed token, not a hardcoded assumption.
- Financial terms, wallet addresses and invoice hashes are public. PDFs remain local. A hash alone is not proof of authenticity or legal assignment.

## Files

- [NEW] package.json, package-lock.json, .gitignore, .env.example: workspace commands, dependencies and environment templates.
- [NEW] contracts/package.json, contracts/hardhat.config.ts, contracts/tsconfig.json: Solidity compilation and test tooling.
- [NEW] contracts/src/ReceivableHub.sol: complete lifecycle, authorization, history, events and errors.
- [NEW] contracts/src/MockUSDG.sol: explicitly local test token.
- [NEW] contracts/test/ReceivableHub.test.ts: lifecycle, invalid inputs, permissions, boundary times, duplicate operations and multi-invoice bond accounting.
- [NEW] contracts/test/ReceivableHub.invariants.test.ts: randomized sequences and conservation checks.
- [NEW] contracts/scripts/deploy.ts, contracts/scripts/demo.ts: network validation, deployment records and three-account evidence runs.
- [NEW] apps/web/package.json, apps/web/tsconfig.json, apps/web/next.config.ts, apps/web/postcss.config.mjs: Next.js, TypeScript and Tailwind setup.
- [NEW] apps/web/app/layout.tsx, apps/web/app/globals.css, apps/web/app/page.tsx: shared shell and concise landing page.
- [NEW] apps/web/app/supplier/page.tsx, apps/web/app/buyer/page.tsx, apps/web/app/market/page.tsx: role workflows.
- [NEW] apps/web/app/receivables/[id]/page.tsx: terms, state, participants and event-backed transaction timeline.
- [NEW] apps/web/app/lab/page.tsx: real RPC contract simulations showing decoded reverts, clearly identified as simulations unless broadcast.
- [NEW] apps/web/components/providers.tsx, wallet.tsx, receivable-card.tsx, transaction-action.tsx: wallet, shared views, approval and transaction receipt handling.
- [NEW] apps/web/lib/contracts.ts, chain.ts, invoice.ts, hooks.ts: generated ABI, chain configuration, local SHA-256 and chain reads.
- [NEW] evidence/deployments.json, transactions.md, test-results.txt, real-vs-simulated.md, threat-model.md: actual evidence only, pending fields labelled explicitly.
- [NEW] docs/architecture.md, economics.md, demo-script.md, submission.md: implementation, risk, three-minute demo and submission copy.
- [NEW] README.md, task.md, system_architecture.md: setup, checklist and persistent implementation decisions.

## Verification gates

- At least 30 meaningful contract tests, including on-time settlement, late settlement, expiry, authorization, no double payout, fixed funder and active bond coverage.
- Compile Solidity and run the complete test suite.
- Typecheck and production-build the frontend.
- Check wallet/network states, amounts, hash calculation, token approvals, receipt confirmation and error display.
- Verify deployed bytecode, token identity and contract source before claiming a real deployment.
- Execute the full lifecycle using three testnet wallets and capture actual explorer links.
- Treat deployment, video recording and submission as incomplete until each has observable evidence.

## External dependencies

Need the user's exact hackathon link/registration status, an available testnet wallet for signing, Arbitrum Sepolia gas and official test USDG, plus a destination for the public repository and frontend. Never request private keys in chat. Build and local testing can proceed before these are resolved.

HackQuest currently lists an October 4 end date for the Singapore Online Buildathon. Confirm the user's event and its authoritative rules before relying on that deadline. Paxos documentation lists test USDG on Arbitrum Sepolia. Faucet availability and usable balances still require verification.

Sources:
- https://www.hackquest.io/hackathons/Arbitrum-Open-House-Singapore-Online-Buildathon
- https://docs.paxos.com/guides/stablecoin/usdg/testnet

## Time priorities

Aim for roughly 3 hours on contracts and tests, 3 hours on the functional UI, 2 hours on deployment and real transactions, and 1 hour on demo and submission. These are estimates, not a promise. If time is short, simplify the landing page and Security Lab presentation first. Preserve contract checks, real evidence and honest limitations.
