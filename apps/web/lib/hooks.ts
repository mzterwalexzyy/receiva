"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { erc20Abi, formatUnits, type Address, type Hash, BaseError, type Abi } from "viem";
import { useState } from "react";
import { hubAbi } from "./abi";
import { hubAddress, chain, expectedToken, type Receivable } from "./chain";

export function useProtocol() {
  const client = usePublicClient();
  return useQuery({ queryKey: ["protocol", hubAddress], enabled: !!hubAddress && !!client, queryFn: async () => {
    const token = await client!.readContract({ address: hubAddress!, abi: hubAbi, functionName: "USDG" });
    if (token.toLowerCase() !== expectedToken.toLowerCase()) throw new Error("Configured hub is not using the verified Arbitrum Sepolia USDG token.");
    const [decimals, symbol] = await Promise.all([
      client!.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
      client!.readContract({ address: token, abi: erc20Abi, functionName: "symbol" })
    ]);
    return { token, decimals, symbol };
  } });
}
export function useReceivables() {
  const client = usePublicClient();
  return useQuery({ queryKey: ["receivables", hubAddress], enabled: !!hubAddress && !!client, refetchInterval: 12000, queryFn: async () => {
    const count = await client!.readContract({ address: hubAddress!, abi: hubAbi, functionName: "nextReceivableId" });
    const start = count > 100n ? count - 100n : 0n;
    const rows = await Promise.all(Array.from({ length: Number(count - start) }, async (_, index) => {
      const id = count - 1n - BigInt(index);
      const r = await client!.readContract({ address: hubAddress!, abi: hubAbi, functionName: "receivables", args: [id] });
      return fromTuple(id, r);
    }));
    return { rows, count };
  } });
}
export function fromTuple(id: bigint, r: readonly unknown[]): Receivable {
  const [invoiceHash, supplier, buyer, funder, faceValue, advanceAmount, bondAmount, outstandingAmount, dueDate, fundingDeadline, status] = r;
  return { id, invoiceHash, supplier, buyer, funder, faceValue, advanceAmount, bondAmount, outstandingAmount, dueDate, fundingDeadline, status } as Receivable;
}
export function useHistory(buyer?: Address) {
  const client = usePublicClient();
  return useQuery({ queryKey: ["history", buyer, hubAddress], enabled: !!buyer && !!hubAddress, queryFn: async () => {
    const values = await Promise.all((["successfulRepayments", "lateRepayments", "defaults"] as const).map(functionName => client!.readContract({ address: hubAddress!, abi: hubAbi, functionName, args: [buyer!] })));
    return { onTime: values[0], late: values[1], defaults: values[2] };
  } });
}
export const money = (amount: bigint, decimals: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: Math.min(decimals, 6) }).format(Number(formatUnits(amount, decimals)));
export const date = (seconds: bigint) => new Date(Number(seconds) * 1000).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const errorText = (error: unknown) => error instanceof BaseError ? error.shortMessage : error instanceof Error ? error.message : String(error);

export function useTransaction() {
  const { address, chainId } = useAccount();
  const { data: wallet } = useWalletClient();
  const client = usePublicClient();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [hash, setHash] = useState<Hash>();
  const [failed, setFailed] = useState(false);
  async function run(functionName: string, args: readonly unknown[], spend?: { token: Address; amount: bigint }) {
    setFailed(false); setHash(undefined); setMessage("");
    if (!address || !wallet || !client || !hubAddress) { setFailed(true); setMessage("Connect a wallet to the configured contract first."); return false; }
    if (chainId !== chain.id) { setFailed(true); setMessage(`Switch your wallet to ${chain.name}.`); return false; }
    setPending(true);
    try {
      if (spend && spend.amount > 0n) {
        const [allowance, balance] = await Promise.all([
          client.readContract({ address: spend.token, abi: erc20Abi, functionName: "allowance", args: [address, hubAddress] }),
          client.readContract({ address: spend.token, abi: erc20Abi, functionName: "balanceOf", args: [address] })
        ]);
        if (balance < spend.amount) throw new Error("This wallet needs more settlement tokens for this action.");
        if (allowance < spend.amount) {
          // Zero first for tokens that require an allowance reset. Never grant unlimited spending.
          if (allowance > 0n) {
            setMessage("Confirm allowance reset in your wallet.");
            const reset = await wallet.writeContract({ address: spend.token, abi: erc20Abi, functionName: "approve", args: [hubAddress, 0n] });
            if ((await client.waitForTransactionReceipt({ hash: reset })).status !== "success") throw new Error("Allowance reset reverted.");
          }
          setMessage("Confirm token allowance in your wallet. The invoice action follows.");
          const approval = await wallet.writeContract({ address: spend.token, abi: erc20Abi, functionName: "approve", args: [hubAddress, spend.amount] });
          setHash(approval); setMessage("Waiting for token allowance confirmation.");
          if ((await client.waitForTransactionReceipt({ hash: approval })).status !== "success") throw new Error("Token approval reverted.");
        }
      }
      const { request } = await client.simulateContract({ address: hubAddress, abi: hubAbi as Abi, functionName, args, account: address });
      setMessage("Confirm the invoice action in your wallet.");
      const tx = await wallet.writeContract(request); setHash(tx); setMessage("Transaction sent. Waiting for confirmation.");
      const receipt = await client.waitForTransactionReceipt({ hash: tx });
      if (receipt.status !== "success") throw new Error("Transaction reverted onchain.");
      setMessage("Transaction confirmed."); await queryClient.invalidateQueries(); return true;
    } catch (error) { setFailed(true); setMessage(errorText(error)); return false; }
    finally { setPending(false); }
  }
  return { run, pending, message, hash, failed };
}
