import { ethers } from "hardhat";
async function main() {
  if ((await ethers.provider.getNetwork()).chainId !== 421614n) throw new Error("Arbitrum Sepolia only.");
  const [deployer] = await ethers.getSigners();
  if (!process.env.BUYER_PRIVATE_KEY || !process.env.FUNDER_PRIVATE_KEY) throw new Error("Demo accounts not configured.");
  const token = new ethers.Contract("0xFFC95faa3d63Cde504a05B567C600B78C0b41892", ["function balanceOf(address) view returns(uint256)", "function transfer(address,uint256) returns(bool)"], deployer);
  for (const key of [process.env.BUYER_PRIVATE_KEY, process.env.FUNDER_PRIVATE_KEY]) {
    const address = new ethers.Wallet(key).address;
    const gas = await ethers.provider.getBalance(address);
    if (gas < ethers.parseEther("0.002")) { const tx = await deployer.sendTransaction({ to: address, value: ethers.parseEther("0.002") - gas }); await tx.wait(); console.log(`Test gas ${address}: ${tx.hash}`); }
    const balance = await token.balanceOf(address), target = ethers.parseUnits("25", 6);
    if (balance < target) { const tx = await token.transfer(address, target - balance); await tx.wait(); console.log(`Test USDG ${address}: ${tx.hash}`); }
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
