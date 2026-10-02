import { ethers, network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const local = chainId === 31337;
  if (!local && chainId !== 421614) throw new Error("Only local and Arbitrum Sepolia deployments are supported.");
  let tokenAddress = process.env.USDG_ADDRESS || (!local ? "0xFFC95faa3d63Cde504a05B567C600B78C0b41892" : undefined);
  if (local) {
    const token = await ethers.deployContract("MockUSDG"); await token.waitForDeployment(); tokenAddress = await token.getAddress();
    for (const actor of (await ethers.getSigners()).slice(0, 3)) await (await token.mint(actor.address, ethers.parseUnits("100000", 6))).wait();
  }
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) throw new Error("Set USDG_ADDRESS to the official Arbitrum Sepolia token from Paxos documentation.");
  if ((await ethers.provider.getCode(tokenAddress)) === "0x") throw new Error("No token bytecode at configured address.");
  const token = new ethers.Contract(tokenAddress, ["function symbol() view returns(string)", "function decimals() view returns(uint8)"], ethers.provider);
  const [symbol, decimals] = await Promise.all([token.symbol(), token.decimals()]);
  if (!local && symbol !== "USDG") throw new Error("Token symbol is not USDG. Check the official address.");
  const hub = await ethers.deployContract("ReceivableHub", [tokenAddress]); await hub.waitForDeployment();
  const receipt = await hub.deploymentTransaction()!.wait();
  const record = { network: network.name, chainId, hub: await hub.getAddress(), token: tokenAddress, symbol, decimals: Number(decimals), blockNumber: receipt!.blockNumber, deploymentTransaction: receipt!.hash, sourceVerified: false, deployedAt: new Date().toISOString() };
  fs.mkdirSync(path.resolve(__dirname, "../../evidence"), { recursive: true });
  fs.writeFileSync(path.resolve(__dirname, `../../evidence/deployment-${chainId}.json`), JSON.stringify(record, null, 2));
  fs.writeFileSync(path.resolve(__dirname, "../../apps/web/.env.local"), `NEXT_PUBLIC_CHAIN_ID=${chainId}\nNEXT_PUBLIC_RPC_URL=${local ? "http://127.0.0.1:8545" : process.env.ARBITRUM_SEPOLIA_RPC || "https://sepolia-rollup.arbitrum.io/rpc"}\nNEXT_PUBLIC_HUB_ADDRESS=${record.hub}\nNEXT_PUBLIC_DEPLOYMENT_BLOCK=${record.blockNumber}\n`);
  console.log(JSON.stringify(record, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
