"use client";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { useEffect, useState } from "react";
import { chain, short } from "@/lib/chain";
import { errorText } from "@/lib/hooks";
export function Wallet() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { address, chainId } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect(); const { switchChain, error: switchError } = useSwitchChain();
  return <div className="wallet-wrap">{mounted && address ? <>
    {chainId !== chain.id && <button className="button" onClick={() => switchChain({ chainId: chain.id })}>Switch network</button>}
    <button className="button secondary" title="Disconnect wallet" onClick={() => disconnect()}>{short(address)} · Disconnect</button>
  </> : <button className="button" disabled={isPending || !mounted || !connectors.length} onClick={() => connect({ connector: connectors[0] })}>{isPending ? "Connecting…" : !connectors.length && mounted ? "Wallet unavailable" : "Connect wallet"}</button>}
  {(error || switchError) && <span className="wallet-error" role="alert">{errorText(error || switchError)}</span>}</div>;
}
