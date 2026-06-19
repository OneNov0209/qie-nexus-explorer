import axios from "axios";
import { NETWORK } from "@/data/network";
import { cached, ttlFor } from "./cache";
import * as bech32 from "bech32";

const rpcAxios = axios.create({ baseURL: '/api/rpc', timeout: 15000 });
const restAxios = axios.create({ baseURL: '/api/rest', timeout: 15000 });

const directApiAxios = axios.create({ 
  baseURL: NETWORK.rest,
  timeout: 15000 
});

function wrap(client: ReturnType<typeof axios.create>, tag: string) {
  return {
    get<T = any>(url: string, config?: Parameters<typeof client.get>[1]) {
      const key = `${tag}:GET ${url}?${JSON.stringify(config?.params ?? {})}`;
      return cached(key, ttlFor(url), () => client.get<T>(url, config));
    },
    post: client.post.bind(client),
    request: client.request.bind(client),
  };
}

export const rpc = wrap(rpcAxios, "rpc") as any;
export const rest = wrap(restAxios, "rest") as any;

export const evmRpc = async <T = any>(method: string, params: any[] = []): Promise<T> => {
  const key = `evm:${method}(${JSON.stringify(params)})`;
  return cached(key, ttlFor(method), async () => {
    const { data } = await axios.post('/api/evm', {
      jsonrpc: "2.0", id: Date.now(), method, params,
    }, { timeout: 15000 });
    if (data.error) throw new Error(data.error.message);
    return data.result as T;
  });
};

export const evm = {
  blockNumber: async () => parseInt(await evmRpc<string>("eth_blockNumber"), 16),
  getBlock: (numOrHash: number | string, full = false) => {
    const tag = typeof numOrHash === "number"
      ? "0x" + numOrHash.toString(16)
      : numOrHash;
    const method = typeof numOrHash === "string" && numOrHash.startsWith("0x") && numOrHash.length === 66
      ? "eth_getBlockByHash"
      : "eth_getBlockByNumber";
    return evmRpc<any>(method, [tag, full]);
  },
  getTx: (hash: string) => evmRpc<any>("eth_getTransactionByHash", [hash]),
  getReceipt: (hash: string) => evmRpc<any>("eth_getTransactionReceipt", [hash]),
};

export const hexToNum = (h?: string) => (h ? parseInt(h, 16) : 0);
export const formatWei = (hex?: string, decimals = 6) => {
  if (!hex) return "0";
  const v = Number(BigInt(hex)) / 1e18;
  return v.toLocaleString(undefined, { maximumFractionDigits: decimals });
};

export const formatQIE = (amount: string | number | undefined, decimals = 4) => {
  if (amount === undefined || amount === null) return "0";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!isFinite(n)) return "0";
  const v = n / 10 ** NETWORK.decimals;
  return v.toLocaleString(undefined, { maximumFractionDigits: decimals });
};

export const shorten = (s?: string, head = 8, tail = 6) => {
  if (!s) return "";
  if (s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
};

export function consensusPubkeyToAddress(pubkey: string): string {
  if (!pubkey) return "";
  try {
    const binaryString = atob(pubkey);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const addressHex = hex.slice(-40);
    const words = bech32.toWords(Buffer.from(addressHex, 'hex'));
    return bech32.encode('qievalcons', words);
  } catch {
    return pubkey;
  }
}

export const cosmos = {
  status: () => rpc.get("/status").then((r: any) => r.data?.result),
  netInfo: () => rpc.get("/net_info").then((r: any) => r.data?.result),
  block: (height?: number | string) =>
    rpc.get("/block", { params: height ? { height: String(height) } : {} }).then((r: any) => r.data?.result),
  blockchain: (minH: number, maxH: number) =>
    rpc.get("/blockchain", { params: { minHeight: minH, maxHeight: maxH } }).then((r: any) => r.data?.result),
  consensusState: () => rpc.get("/consensus_state").then((r: any) => r.data?.result),
  validatorsRPC: () => rpc.get("/validators").then((r: any) => r.data?.result),

  validators: () =>
    rest.get("/cosmos/staking/v1beta1/validators", { params: { "pagination.limit": 200 } }).then((r: any) => r.data),
  stakingPool: () => rest.get("/cosmos/staking/v1beta1/pool").then((r: any) => r.data?.pool),
  stakingParams: () => rest.get("/cosmos/staking/v1beta1/params").then((r: any) => r.data?.params),
  supply: () => rest.get("/cosmos/bank/v1beta1/supply").then((r: any) => r.data?.supply),
  inflation: () => rest.get("/cosmos/mint/v1beta1/inflation").then((r: any) => r.data?.inflation),
  mintParams: () => rest.get("/cosmos/mint/v1beta1/params").then((r: any) => r.data?.params),
  annualProvisions: () => rest.get("/cosmos/mint/v1beta1/annual_provisions").then((r: any) => r.data?.annual_provisions),
  communityPool: () => rest.get("/cosmos/distribution/v1beta1/community_pool").then((r: any) => r.data?.pool),
  proposals: () =>
    rest.get("/cosmos/gov/v1beta1/proposals", { params: { "pagination.limit": 50, "pagination.reverse": true } }).then((r: any) => r.data),
  txsByHeight: (height: number) =>
    rest.get("/cosmos/tx/v1beta1/txs", { params: { events: `tx.height=${height}` } }).then((r: any) => r.data),
  txByHash: (hash: string) => rest.get(`/cosmos/tx/v1beta1/txs/${hash}`).then((r: any) => r.data),
  ibcChannels: () => rest.get("/ibc/core/channel/v1/channels").then((r: any) => r.data),
  ibcConnections: () => rest.get("/ibc/core/connection/v1/connections").then((r: any) => r.data),
  ibcClients: () => rest.get("/ibc/core/client/v1/client_states").then((r: any) => r.data),
  wasmCodes: () => rest.get("/cosmwasm/wasm/v1/code").then((r: any) => r.data),
  wasmContracts: (codeId: string | number) =>
    rest.get(`/cosmwasm/wasm/v1/code/${codeId}/contracts`).then((r: any) => r.data),
  slashingParams: () => rest.get("/cosmos/slashing/v1beta1/params").then((r: any) => r.data?.params),
  signingInfos: () =>
    directApiAxios.get("/cosmos/slashing/v1beta1/signing_infos", { params: { "pagination.limit": 500 } }).then((r: any) => r.data),
  delegations: (address: string) =>
    rest.get(`/cosmos/staking/v1beta1/delegations/${address}`).then((r: any) => r.data),
  unbonding: (address: string) =>
    rest.get(`/cosmos/staking/v1beta1/delegators/${address}/unbonding_delegations`).then((r: any) => r.data),
  rewards: (address: string) =>
    rest.get(`/cosmos/distribution/v1beta1/delegators/${address}/rewards`).then((r: any) => r.data),
  balance: (address: string) =>
    rest.get(`/cosmos/bank/v1beta1/balances/${address}`).then((r: any) => r.data),
  validatorByAddr: (valoper: string) =>
    rest.get(`/cosmos/staking/v1beta1/validators/${valoper}`).then((r: any) => r.data?.validator),
};
