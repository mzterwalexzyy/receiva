# Threat model

The contract trusts the selected token to behave as a standard ERC-20 without transfer fees or rebasing. Paxos issuer controls, pauses, freezes and upgrades may prevent transfers. Receiva does not override them.

An attacker cannot become a second funder, change an existing funder, cancel a funded invoice or receive a second settlement through supported contract functions. Atomic transactions and a reentrancy guard protect token-moving transitions. All value checks, roles and deadlines are enforced onchain.

Approval expresses a wallet's agreement to an invoice's terms. It does not prove the buyer's real-world identity, legal obligation or ability to pay. Related parties can use multiple wallets and fake repayment history. Hash registration does not prove ownership and is vulnerable to hash squatting. Changing PDF bytes defeats exact duplicate detection. Cross-platform duplicate financing is not prevented.

Public terms and hashes can disclose relationships and support document-guessing attacks. PDFs must be shared through an existing private business channel. Hash registration is scoped to the supplier, which prevents cross-supplier hash squatting but does not prove document ownership. Lost keys can prevent repayment or recovery. There is no administrative rescue for accidental token transfers.

Date boundaries: approval/funding before fundingDeadline, expiry at or after fundingDeadline, on-time settlement at or before dueDate, default after dueDate. A stale browser clock can cause the UI to offer a transaction that the chain rejects. The contract is authoritative.

Frontend RPCs can be unavailable or return misleading data. Users should compare addresses and receipts on the explorer. Browser wallets should be checked before signing. Secrets are local and excluded from Git. This prototype is not approved for real customer funds.
