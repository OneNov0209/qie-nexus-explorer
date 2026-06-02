import { create } from "zustand";
import { NETWORK } from "@/data/network";

type EvmState = {
  address?: string;
  chainId?: number;
  balance?: string; // in QIE
};
type CosmosState = {
  address?: string;
  name?: string;
};

type WalletStore = {
  evm: EvmState;
  cosmos: CosmosState;
  setEvm: (e: EvmState) => void;
  setCosmos: (c: CosmosState) => void;
  disconnectEvm: () => void;
  disconnectCosmos: () => void;
};

export const useWallet = create<WalletStore>((set) => ({
  evm: {},
  cosmos: {},
  setEvm: (evm) => set({ evm }),
  setCosmos: (cosmos) => set({ cosmos }),
  disconnectEvm: () => set({ evm: {} }),
  disconnectCosmos: () => set({ cosmos: {} }),
}));

// ---- MetaMask / EVM ----
declare global {
  interface Window {
    ethereum?: any;
    keplr?: any;
    leap?: any;
    getOfflineSigner?: any;
  }
}

export async function connectMetaMask() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not detected. Please install MetaMask.");
  }
  const eth = window.ethereum;
  const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
  const address = accounts[0];
  // Ensure correct network
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: NETWORK.chainIdHex }],
    });
  } catch (err: any) {
    if (err?.code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: NETWORK.chainIdHex,
          chainName: NETWORK.name,
          nativeCurrency: { name: NETWORK.coin, symbol: NETWORK.symbol, decimals: 18 },
          rpcUrls: [NETWORK.evmRpc],
          blockExplorerUrls: [],
        }],
      });
    } else {
      throw err;
    }
  }
  const chainIdHex: string = await eth.request({ method: "eth_chainId" });
  const balHex: string = await eth.request({ method: "eth_getBalance", params: [address, "latest"] });
  const balance = (Number(BigInt(balHex)) / 1e18).toFixed(4);
  useWallet.getState().setEvm({ address, chainId: parseInt(chainIdHex, 16), balance });

  eth.on?.("accountsChanged", (acs: string[]) => {
    if (!acs[0]) useWallet.getState().disconnectEvm();
    else useWallet.getState().setEvm({ ...useWallet.getState().evm, address: acs[0] });
  });
  eth.on?.("chainChanged", (cid: string) => {
    useWallet.getState().setEvm({ ...useWallet.getState().evm, chainId: parseInt(cid, 16) });
  });
}

// ---- Keplr / Cosmos ----
export async function connectKeplr(provider: "keplr" | "leap" = "keplr") {
  const w = window as any;
  const p = provider === "leap" ? w.leap : w.keplr;
  if (!p) throw new Error(`${provider} not detected. Please install the extension.`);
  try {
    await p.experimentalSuggestChain?.(qieChainSuggestion());
  } catch (e) {
    // user may have rejected suggestion; try enable directly
  }
  await p.enable(NETWORK.cosmosChainId);
  const key = await p.getKey(NETWORK.cosmosChainId);
  useWallet.getState().setCosmos({ address: key.bech32Address, name: key.name });
}

function qieChainSuggestion() {
  return {
    chainId: NETWORK.cosmosChainId,
    chainName: NETWORK.name,
    rpc: NETWORK.rpc,
    rest: NETWORK.rest,
    bip44: { coinType: NETWORK.coinType },
    bech32Config: {
      bech32PrefixAccAddr: NETWORK.bech32Prefix,
      bech32PrefixAccPub: `${NETWORK.bech32Prefix}pub`,
      bech32PrefixValAddr: `${NETWORK.bech32Prefix}valoper`,
      bech32PrefixValPub: `${NETWORK.bech32Prefix}valoperpub`,
      bech32PrefixConsAddr: `${NETWORK.bech32Prefix}valcons`,
      bech32PrefixConsPub: `${NETWORK.bech32Prefix}valconspub`,
    },
    currencies: [{ coinDenom: NETWORK.coin, coinMinimalDenom: NETWORK.denom, coinDecimals: NETWORK.decimals }],
    feeCurrencies: [{
      coinDenom: NETWORK.coin, coinMinimalDenom: NETWORK.denom, coinDecimals: NETWORK.decimals,
      gasPriceStep: { low: 10000000000, average: 25000000000, high: 40000000000 },
    }],
    stakeCurrency: { coinDenom: NETWORK.coin, coinMinimalDenom: NETWORK.denom, coinDecimals: NETWORK.decimals },
    features: ["eth-address-gen", "eth-key-sign"],
  };
}
