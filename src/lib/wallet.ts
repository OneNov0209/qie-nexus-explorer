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
  balance?: string; // in QIE
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

// ---- MetaMask / EVM (also used by QIE Wallet EVM mode) ----
declare global {
  interface Window {
    ethereum?: any;
    keplr?: any;
    qie?: any;
    leap?: any;
    getOfflineSigner?: any;
  }
}

export async function connectMetaMask() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No EVM wallet detected. Please install MetaMask or QIE Wallet.");
  }
  const eth = window.ethereum;

  const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
  const address = accounts[0];

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
    if (!acs[0]) {
      useWallet.getState().disconnectEvm();
    } else {
      eth.request({ method: "eth_getBalance", params: [acs[0], "latest"] }).then((b: string) => {
        useWallet.getState().setEvm({
          address: acs[0],
          chainId: useWallet.getState().evm.chainId,
          balance: (Number(BigInt(b)) / 1e18).toFixed(4),
        });
      });
    }
  });

  eth.on?.("chainChanged", (cid: string) => {
    useWallet.getState().setEvm({
      ...useWallet.getState().evm,
      chainId: parseInt(cid, 16),
    });
  });
}

// QIE Wallet EVM mode = same as MetaMask
export async function connectQieWallet() {
  return connectMetaMask();
}

// ---- Keplr / QIE Wallet Cosmos mode ----
export async function connectKeplr() {
  const w = window as any;
  // QIE Wallet exposes both qie (EVM) and keplr (Cosmos) APIs
  const keplrApi = w.keplr;
  const qieApi = w.qie;

  if (!keplrApi && !qieApi) {
    throw new Error("No Cosmos wallet detected. Please install QIE Wallet or Keplr.");
  }

  // Use QIE Wallet's enable if available, otherwise Keplr's
  if (qieApi) {
    // QIE Wallet - use its own enable
    await qieApi.enable(NETWORK.cosmosChainId);
  } else if (keplrApi) {
    // Keplr - suggest chain first
    try {
      await keplrApi.experimentalSuggestChain?.(qieChainSuggestion());
    } catch (e) {
      // user may have rejected suggestion; try enable directly
    }
    await keplrApi.enable(NETWORK.cosmosChainId);
  }

  // Get key from keplr API (QIE Wallet mirrors this)
  const key = await keplrApi.getKey(NETWORK.cosmosChainId);

  // Fetch balance
  let balance = "0";
  try {
    const res = await fetch(`/api/rest/cosmos/bank/v1beta1/balances/${key.bech32Address}`);
    const data = await res.json();
    const qieBalance = data?.balances?.find((b: any) => b.denom === NETWORK.denom);
    if (qieBalance) {
      balance = (Number(qieBalance.amount) / 10 ** NETWORK.decimals).toFixed(4);
    }
  } catch {}

  useWallet.getState().setCosmos({
    address: key.bech32Address,
    name: key.name,
    balance,
  });
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
