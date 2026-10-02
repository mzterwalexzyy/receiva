// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Single-funder invoice financing. Approval attests to terms, not legal enforceability.
/// @dev Only intended for a standard, non-fee-on-transfer USDG token selected at deployment.
contract ReceivableHub is ReentrancyGuard {
    using SafeERC20 for IERC20;
    enum Status { Draft, Approved, Funded, Settled, Defaulted, SettledLate, Cancelled, Expired }
    struct Receivable {
        bytes32 invoiceHash;
        address supplier;
        address buyer;
        address funder;
        uint128 faceValue;
        uint128 advanceAmount;
        uint128 bondAmount;
        uint128 outstandingAmount;
        uint64 dueDate;
        uint64 fundingDeadline;
        Status status;
    }
    IERC20 public immutable USDG;
    uint256 public nextReceivableId;
    uint256 public totalActiveBonds;
    mapping(uint256 => Receivable) public receivables;
    mapping(bytes32 => bool) public registeredInvoiceHashes;
    mapping(address => uint256) public successfulRepayments;
    mapping(address => uint256) public lateRepayments;
    mapping(address => uint256) public defaults;

    error Unauthorized();
    error InvalidStatus();
    error UnknownReceivable();
    error InvalidParticipant();
    error InvalidInvoiceHash();
    error InvalidToken();
    error InvalidAmount();
    error InvalidDates();
    error DuplicateInvoice();
    error FundingWindowClosed();
    error FundingWindowOpen();
    error DueDateNotReached();
    error PostFundingCancellationForbidden();
    error ReceivableAlreadyFunded();

    event ReceivableCreated(uint256 indexed id, bytes32 indexed invoiceHash, address indexed supplier, address buyer, uint256 faceValue, uint256 advanceAmount);
    event ReceivableApproved(uint256 indexed id, address indexed buyer, uint256 bondAmount);
    event ReceivableFunded(uint256 indexed id, address indexed funder, uint256 advanceAmount);
    event ReceivableSettled(uint256 indexed id, address indexed funder, uint256 amount);
    event ReceivableDefaulted(uint256 indexed id, uint256 bondPaid, uint256 outstandingAmount);
    event DefaultCured(uint256 indexed id, uint256 amount);
    event ReceivableCancelled(uint256 indexed id);
    event ReceivableExpired(uint256 indexed id, uint256 bondReturned);

    constructor(address token) {
        if (token == address(0) || token.code.length == 0) revert InvalidToken();
        USDG = IERC20(token);
    }

    function createReceivable(bytes32 invoiceHash, address buyer, uint128 faceValue, uint128 advanceAmount, uint128 requiredBond, uint64 dueDate, uint64 fundingDeadline) external returns (uint256 id) {
        if (buyer == address(0) || buyer == msg.sender || buyer == address(this)) revert InvalidParticipant();
        if (invoiceHash == bytes32(0)) revert InvalidInvoiceHash();
        if (registeredInvoiceHashes[invoiceHash]) revert DuplicateInvoice();
        if (advanceAmount == 0 || advanceAmount >= faceValue || requiredBond == 0 || requiredBond >= faceValue) revert InvalidAmount();
        if (fundingDeadline <= block.timestamp || dueDate <= fundingDeadline) revert InvalidDates();
        id = nextReceivableId++;
        registeredInvoiceHashes[invoiceHash] = true;
        receivables[id] = Receivable(invoiceHash, msg.sender, buyer, address(0), faceValue, advanceAmount, requiredBond, 0, dueDate, fundingDeadline, Status.Draft);
        emit ReceivableCreated(id, invoiceHash, msg.sender, buyer, faceValue, advanceAmount);
    }

    function cancelDraft(uint256 id) external {
        Receivable storage r = _get(id);
        if (r.funder != address(0)) revert PostFundingCancellationForbidden();
        if (msg.sender != r.supplier) revert Unauthorized();
        if (r.status != Status.Draft) revert InvalidStatus();
        r.status = Status.Cancelled;
        emit ReceivableCancelled(id);
    }

    function approveReceivable(uint256 id) external nonReentrant {
        Receivable storage r = _get(id);
        if (msg.sender != r.buyer) revert Unauthorized();
        if (r.status != Status.Draft) revert InvalidStatus();
        if (block.timestamp >= r.fundingDeadline) revert FundingWindowClosed();
        r.status = Status.Approved;
        totalActiveBonds += r.bondAmount;
        USDG.safeTransferFrom(msg.sender, address(this), r.bondAmount);
        emit ReceivableApproved(id, msg.sender, r.bondAmount);
    }

    function fundReceivable(uint256 id) external nonReentrant {
        Receivable storage r = _get(id);
        if (r.funder != address(0)) revert ReceivableAlreadyFunded();
        if (r.status != Status.Approved) revert InvalidStatus();
        if (block.timestamp >= r.fundingDeadline) revert FundingWindowClosed();
        if (msg.sender == r.supplier || msg.sender == r.buyer) revert InvalidParticipant();
        r.status = Status.Funded;
        r.funder = msg.sender;
        r.outstandingAmount = r.faceValue;
        USDG.safeTransferFrom(msg.sender, r.supplier, r.advanceAmount);
        emit ReceivableFunded(id, msg.sender, r.advanceAmount);
    }

    /// @notice A direct late payment consumes the bond and pays only the remainder.
    function settleReceivable(uint256 id) external nonReentrant {
        Receivable storage r = _get(id);
        if (msg.sender != r.buyer) revert Unauthorized();
        if (r.status != Status.Funded) revert InvalidStatus();
        bool late = block.timestamp > r.dueDate;
        r.outstandingAmount = 0;
        totalActiveBonds -= r.bondAmount;
        if (late) {
            r.status = Status.SettledLate;
            defaults[r.buyer]++;
            lateRepayments[r.buyer]++;
            uint256 remainder = r.faceValue - r.bondAmount;
            USDG.safeTransferFrom(r.buyer, r.funder, remainder);
            USDG.safeTransfer(r.funder, r.bondAmount);
            emit ReceivableDefaulted(id, r.bondAmount, remainder);
            emit DefaultCured(id, remainder);
        } else {
            r.status = Status.Settled;
            successfulRepayments[r.buyer]++;
            USDG.safeTransferFrom(r.buyer, r.funder, r.faceValue);
            USDG.safeTransfer(r.buyer, r.bondAmount);
            emit ReceivableSettled(id, r.funder, r.faceValue);
        }
    }

    function expireReceivable(uint256 id) external nonReentrant {
        Receivable storage r = _get(id);
        if (r.status != Status.Approved) revert InvalidStatus();
        if (block.timestamp < r.fundingDeadline) revert FundingWindowOpen();
        r.status = Status.Expired;
        totalActiveBonds -= r.bondAmount;
        USDG.safeTransfer(r.buyer, r.bondAmount);
        emit ReceivableExpired(id, r.bondAmount);
    }

    function markDefault(uint256 id) external nonReentrant {
        Receivable storage r = _get(id);
        if (r.status != Status.Funded) revert InvalidStatus();
        if (block.timestamp <= r.dueDate) revert DueDateNotReached();
        r.status = Status.Defaulted;
        r.outstandingAmount = r.faceValue - r.bondAmount;
        totalActiveBonds -= r.bondAmount;
        defaults[r.buyer]++;
        USDG.safeTransfer(r.funder, r.bondAmount);
        emit ReceivableDefaulted(id, r.bondAmount, r.outstandingAmount);
    }

    function cureDefault(uint256 id) external nonReentrant {
        Receivable storage r = _get(id);
        if (msg.sender != r.buyer) revert Unauthorized();
        if (r.status != Status.Defaulted) revert InvalidStatus();
        uint256 remainder = r.outstandingAmount;
        r.status = Status.SettledLate;
        r.outstandingAmount = 0;
        lateRepayments[r.buyer]++;
        USDG.safeTransferFrom(r.buyer, r.funder, remainder);
        emit DefaultCured(id, remainder);
    }

    function _get(uint256 id) private view returns (Receivable storage r) {
        if (id >= nextReceivableId) revert UnknownReceivable();
        return receivables[id];
    }
}
