import axios from "axios";
import { NETWORK } from "@/data/network";

export const rpc = axios.create({ baseURL: NETWORK.rpc, timeout: 15000 });
export const rest = axios.create({ baseURL: NETWORK.rest, timeout: 15000 });

export const evmRpc = async <T = any>(method: string, params: any[] = []): Promise<T> => {
  const { data } = await axios.post(NETWORK.evmRpc, {
    jsonrpc: "2.0", id: Date.now(), method, params,
  }, { timeout: 15000 });
  if (data.error) throw new Error(data.error.message);
  return data.result as T;
};

// Format aqie -> QIE
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

// --- Cosmos REST helpers ---
export const cosmos = {
  status: () => rpc.get("/status").then(r => r.data?.result),
  netInfo: () => rpc.get("/net_info").then(r => r.data?.result),
  block: (height?: number | string) =>
    rpc.get("/block", { params: height ? { height: String(height) } : {} }).then(r => r.data?.result),
  blockchain: (minH: number, maxH: number) =>
    rpc.get("/blockchain", { params: { minHeight: minH, maxHeight: maxH } }).then(r => r.data?.result),
  consensusState: () => rpc.get("/consensus_state").then(r => r.data?.result),
  validatorsRPC: () => rpc.get("/validators").then(r => r.data?.result),

  validators: () =>
    rest.get("/cosmos/staking/v1beta1/validators", { params: { "pagination.limit": 200 } }).then(r => r.data),
  stakingPool: () => rest.get("/cosmos/staking/v1beta1/pool").then(r => r.data?.pool),
  stakingParams: () => rest.get("/cosmos/staking/v1beta1/params").then(r => r.data?.params),
  supply: () => rest.get("/cosmos/bank/v1beta1/supply").then(r => r.data?.supply),
  inflation: () => rest.get("/cosmos/mint/v1beta1/inflation").then(r => r.data?.inflation),
  mintParams: () => rest.get("/cosmos/mint/v1beta1/params").then(r => r.data?.params),
  annualProvisions: () => rest.get("/cosmos/mint/v1beta1/annual_provisions").then(r => r.data?.annual_provisions),
  communityPool: () => rest.get("/cosmos/distribution/v1beta1/community_pool").then(r => r.data?.pool),
  proposals: () =>
    rest.get("/cosmos/gov/v1beta1/proposals", { params: { "pagination.limit": 50, "pagination.reverse": true } }).then(r => r.data),
  txsByHeight: (height: number) =>
    rest.get("/cosmos/tx/v1beta1/txs", { params: { events: `tx.height=${height}` } }).then(r => r.data),
  txByHash: (hash: string) => rest.get(`/cosmos/tx/v1beta1/txs/${hash}`).then(r => r.data),
  ibcChannels: () => rest.get("/ibc/core/channel/v1/channels").then(r => r.data),
  ibcConnections: () => rest.get("/ibc/core/connection/v1/connections").then(r => r.data),
  ibcClients: () => rest.get("/ibc/core/client/v1/client_states").then(r => r.data),
  wasmCodes: () => rest.get("/cosmwasm/wasm/v1/code").then(r => r.data),
  wasmContracts: (codeId: string | number) =>
    rest.get(`/cosmwasm/wasm/v1/code/${codeId}/contracts`).then(r => r.data),
  slashingParams: () => rest.get("/cosmos/slashing/v1beta1/params").then(r => r.data?.params),
  signingInfos: () =>
    rest.get("/cosmos/slashing/v1beta1/signing_infos", { params: { "pagination.limit": 500 } }).then(r => r.data),
};
