# Persistent project context

Frontend reference refresh: home and dashboard share components/reference-design.tsx. app/reference.css is imported after globals.css and scopes landing styling under rv-landing and light dashboard styling under rv-workspace. Preview and dashboard consume the same contract queries. Never substitute sample financial totals when queries fail or are empty.

Receiva is a Windows-compatible npm workspace with contracts and apps/web. Use npm.cmd in PowerShell if script policy prevents npm.ps1. Node 22 is installed. Solidity 0.8.28 is compiled from the pinned local solc package through Hardhat.

The principal contract is contracts/src/ReceivableHub.sol. Keep ABI generation synchronized via npm run abi -w contracts. Browser code never embeds signing keys. contracts/.env contains generated project testnet wallets and is ignored by Git. evidence/wallets.json contains public addresses only.

Contract decisions: partial positive bond, three distinct roles, draft-only cancellation, exclusive funding deadline, inclusive due date, late direct settlement consumes bond and records default plus late repayment. Do not weaken these rules to make a demo pass.

User approved the implementation plan and authorized generating project wallets, with gas funding supplied by the user. Public repository and hosting destinations have not been supplied. Do not claim deployment or submission completion without evidence.
