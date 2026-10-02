# Architecture

ReceivableHub is the sole principal contract. Its settlement token is immutable. Invoices are keyed by a sequential ID and deduplicated by SHA-256 document hash. Approval creates a bond liability, funding transfers the advance directly to the supplier, and settlement pays the immutable funder.

`totalActiveBonds` tracks escrow liabilities for Approved and Funded invoices. All token-moving functions use a reentrancy guard and update state before transfers. A reverted transfer rolls back the entire action. Funding and settlement are atomic. No owner can sweep balances.

The web application uses Next.js, wagmi, viem and TanStack Query. Browser wallets sign actions. The application reads token metadata from the hub's immutable token and waits for confirmed receipts before refreshing state. Token allowances are exact, with a zero reset when needed. No server receives PDFs or signs user transactions.

All monetary values use integer token units in contract calls. Dates use Unix seconds and the interface displays the device timezone. Approval/funding use an exclusive funding deadline, settlement is on time through the inclusive due date.

The UI reads the most recent 100 invoices, and reads event logs in bounded chunks over the last 50,000 blocks. These limits are visible to users. There is no indexer or backend database.

Local development uses mock USDG. Arbitrum Sepolia deployment requires the official Paxos test token. Deployment and demo scripts preserve a JSON evidence journal. Secrets live only in Git-ignored local environment files.
