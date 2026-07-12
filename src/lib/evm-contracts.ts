import { ethers } from "ethers";
import { TOKENS, DEX_ROUTER, WQIE_ADDRESS } from "@/data/tokens";
import { NETWORK } from "@/data/network";

const WQIE_ABI = [
  "function deposit() payable",
  "function withdraw(uint256 amount)",
  "function balanceOf(address owner) view returns (uint256)",
];

export function getProvider() {
  return new ethers.JsonRpcProvider(NETWORK.evmRpc);
}

export async function getSigner() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No EVM wallet detected");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
}

export function getTokenDecimals(tokenAddress: string): number {
  const token = TOKENS.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
  return token?.decimals || 18;
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
    const decimals = getTokenDecimals(tokenAddress);
    return ethers.formatUnits(balance, decimals);
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

export async function getAllowance(owner: string, tokenAddress: string): Promise<string> {
  try {
    const provider = getProvider();
    const erc20 = new ethers.Contract(
      tokenAddress,
      ["function allowance(address owner, address spender) view returns (uint256)"],
      provider
    );
    const allowance = await erc20.allowance(owner, DEX_ROUTER);
    const decimals = getTokenDecimals(tokenAddress);
    return ethers.formatUnits(allowance, decimals);
  } catch {
    return "0";
  }
}

export async function approveToken(tokenAddress: string, amount: string): Promise<string> {
  const signer = await getSigner();
  const erc20 = new ethers.Contract(
    tokenAddress,
    ["function approve(address spender, uint256 amount) returns (bool)"],
    signer
  );
  const decimals = getTokenDecimals(tokenAddress);
  const tx = await erc20.approve(DEX_ROUTER, ethers.parseUnits(amount, decimals));
  await tx.wait();
  return tx.hash;
}

export async function wrapQIE(amount: string): Promise<{ hash: string }> {
  const signer = await getSigner();
  const wqie = new ethers.Contract(WQIE_ADDRESS, WQIE_ABI, signer);
  const amountWei = ethers.parseEther(amount);
  const tx = await wqie.deposit({ value: amountWei });
  const receipt = await tx.wait();
  return { hash: receipt.hash };
}

export async function unwrapQIE(amount: string): Promise<{ hash: string }> {
  const signer = await getSigner();
  const wqie = new ethers.Contract(WQIE_ADDRESS, WQIE_ABI, signer);
  const amountWei = ethers.parseEther(amount);
  const tx = await wqie.withdraw(amountWei);
  const receipt = await tx.wait();
  return { hash: receipt.hash };
}

export async function getQuote(
  amountIn: string,
  tokenIn: string,
  tokenOut: string
): Promise<string> {
  try {
    const provider = getProvider();
    const router = new ethers.Contract(
      DEX_ROUTER,
      ["function getAmountsOut(uint256 amountIn, address[] memory path) view returns (uint256[] memory)"],
      provider
    );
    
    const decimalsIn = getTokenDecimals(tokenIn);
    const amount = ethers.parseUnits(amountIn, decimalsIn);
    const path = [tokenIn, tokenOut];
    const amounts = await router.getAmountsOut(amount, path);
    const decimalsOut = getTokenDecimals(tokenOut);
    return ethers.formatUnits(amounts[1], decimalsOut);
  } catch (error) {
    console.error("getQuote error:", error);
    return "0";
  }
}

export async function executeSwap(
  amountIn: string,
  tokenIn: string,
  tokenOut: string,
  slippage: number = 0.5
): Promise<{ hash: string }> {
  const signer = await getSigner();
  const router = new ethers.Contract(
    DEX_ROUTER,
    [
      "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory)",
      "function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) payable returns (uint256[] memory)",
      "function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory)"
    ],
    signer
  );
  
  const account = await signer.getAddress();
  const decimalsIn = getTokenDecimals(tokenIn);
  const decimalsOut = getTokenDecimals(tokenOut);
  const amount = ethers.parseUnits(amountIn, decimalsIn);
  
  const quote = await getQuote(amountIn, tokenIn, tokenOut);
  const amountOutMin = ethers.parseUnits(
    (Number(quote) * (1 - slippage / 100)).toString(),
    decimalsOut
  );
  
  const path = [tokenIn, tokenOut];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  
  const isNativeIn = tokenIn === "0x0000000000000000000000000000000000000000";
  const isNativeOut = tokenOut === "0x0000000000000000000000000000000000000000";
  
  let tx;
  if (isNativeIn && !isNativeOut) {
    tx = await router.swapExactETHForTokens(
      amountOutMin,
      path,
      account,
      deadline,
      { value: amount }
    );
  } else if (!isNativeIn && isNativeOut) {
    tx = await router.swapExactTokensForETH(
      amount,
      amountOutMin,
      path,
      account,
      deadline
    );
  } else {
    tx = await router.swapExactTokensForTokens(
      amount,
      amountOutMin,
      path,
      account,
      deadline
    );
  }
  
  const receipt = await tx.wait();
  return { hash: receipt.hash };
}
