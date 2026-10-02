# Submission draft

## Title

Receiva: USDG working capital for approved invoices

## Description

Small suppliers often wait for payment after work is delivered. Receiva lets a supplier offer a buyer-approved invoice to an independent funder at a fixed discount. The buyer posts a partial security bond, the funder advances USDG directly to the supplier, and the buyer pays the funder at maturity.

## Why Arbitrum

Arbitrum provides a shared settlement record for parties who do not share an accounting system. Funding transfers USDG and records the funder atomically. The contract prevents repeated funding of the same registered claim, prohibits cancellation after funding and preserves repayment and default history for each buyer wallet.

## What is distinctive

Receiva makes the default path visible. The bond covers only part of the debt. If the buyer defaults, the funder receives the bond and the remaining amount stays outstanding. Late repayment is possible without erasing the default record.

Invoices are hashed locally. Only the hash, wallet addresses and financing terms go onchain. The interface exposes transaction receipts and a Security Lab for checking rejected contract actions.

## Technology

Solidity, OpenZeppelin, Arbitrum Sepolia, Paxos test USDG, Next.js, TypeScript, wagmi and viem. Hardhat runs lifecycle, access-control, boundary and randomized accounting tests.

## Limitations

Testnet prototype, demo identities and accelerated dates. No business verification, legal invoice assignment or offchain collection. Exact hashes cannot detect modified invoice copies, cross-platform financing or fraudulent business claims. Wallet history is not a credit score.

## Submission links

- Public application: pending
- Source repository: pending
- Verified ReceivableHub: pending
- Funding and repayment receipts: pending
- Demo video: pending

Only replace pending entries after validating the corresponding public links.
