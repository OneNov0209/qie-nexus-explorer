import { ethers } from "ethers";
import { TOKENS } from "@/data/tokens";
import { NETWORK } from "@/data/network";

export function getProvider() {
  return new ethers.JsonRpcProvider(NETWORK.evmRpc);
}

export async function getTokenBalance(address: string, tokenAddress: string): Promise<string> {
  try {
    const provider = getProvider();
    const erc20 = new ethers.Contract(
      tokenAddress,
      ["function balanceOf(address owner) view returns (uint256)"],
      provider
    );
    const balance = await erc20.balanceOf(address);
    const token = TOKENS.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
    return ethers.formatUnits(balance, token?.decimals || 18);
  } catch {
    return "0";
  }
}

export async function getNativeBalance(address: string): Promise<string> {
  try {
    const provider = getProvider();
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch {
    return "0";
  }
}
