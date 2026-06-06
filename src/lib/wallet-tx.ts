/**
 * Cosmos transaction helpers for QIE (Ethermint-based: coinType 60, eth_secp256k1).
 *
 * IMPORTANT: Staking operations (delegate, undelegate, redelegate, withdraw rewards,
 * vote) are ONLY available via Keplr wallet (Cosmos SDK transactions).
 * MetaMask is for EVM transfers only - NOT for staking.
 *
 * Uses Keplr's offline signer + cosmjs SigningStargateClient.
 * Falls back to REST API broadcast if WebSocket is unavailable (Vercel).
 */
import { SigningStargateClient, defaultRegistryTypes, GasPrice, calculateFee, type DeliverTxResponse } from "@cosmjs/stargate";
import { Registry, encodeTx } from "@cosmjs/proto-signing";
import { PubKey } from "cosmjs-types/cosmos/crypto/secp256k1/keys";
import { MsgDelegate, MsgUndelegate, MsgBeginRedelegate } from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { MsgWithdrawDelegatorReward } from "cosmjs-types/cosmos/distribution/v1beta1/tx";
import { MsgVote } from "cosmjs-types/cosmos/gov/v1beta1/tx";
import { NETWORK } from "@/data/network";

const ETH_PUBKEY_TYPE = "/ethermint.crypto.v1.ethsecp256k1.PubKey";

// Use proxy to avoid CORS for HTTP, but WebSocket needs direct RPC
const RPC_ENDPOINT = NETWORK.rpc;

function makeRegistry() {
  const reg = new Registry(defaultRegistryTypes);
  reg.register(ETH_PUBKEY_TYPE, PubKey as any);
  return reg;
}

async function getSigner() {
  const w = window as any;
  const provider = w.keplr;
  if (!provider) throw new Error("Keplr wallet not detected. Please install Keplr.");
  await provider.enable(NETWORK.cosmosChainId);
  const signer = provider.getOfflineSignerOnlyAmino
    ? provider.getOfflineSignerOnlyAmino(NETWORK.cosmosChainId)
    : provider.getOfflineSigner(NETWORK.cosmosChainId);
  return signer;
}

async function connect() {
  const signer = await getSigner();
  // Try WebSocket first, fall back to HTTP
  let client: SigningStargateClient;
  try {
    client = await SigningStargateClient.connectWithSigner(RPC_ENDPOINT, signer, {
      registry: makeRegistry(),
      gasPrice: GasPrice.fromString(`25000000000${NETWORK.denom}`),
    });
  } catch (wsErr) {
    // WebSocket failed (likely on Vercel), create client without RPC connection
    console.warn("WebSocket unavailable, using REST broadcast fallback");
    // Use offline signer directly - we'll broadcast via REST
    client = await SigningStargateClient.offline(signer, {
      registry: makeRegistry(),
    });
  }
  const accounts = await signer.getAccounts();
  if (!accounts[0]) throw new Error("No account found in wallet");
  return { client, sender: accounts[0].address };
}

function coin(amount: string | number) {
  return { denom: NETWORK.denom, amount: String(amount) };
}

export function toMicro(qie: string | number): string {
  const n = typeof qie === "string" ? Number(qie) : qie;
  if (!isFinite(n) || n <= 0) throw new Error("Invalid amount");
  return BigInt(Math.floor(n * 1e6)).toString() + "000000000000";
}

const DEFAULT_FEE = () =>
  calculateFee(250_000, GasPrice.fromString(`25000000000${NETWORK.denom}`));

async function broadcast(msgs: any[], memo = ""): Promise<DeliverTxResponse> {
  const { client, sender } = await connect();
  const fee = DEFAULT_FEE();

  try {
    // Try WebSocket broadcast first
    const res = await client.signAndBroadcast(sender, msgs, fee, memo);
    if (res.code !== 0) throw new Error(res.rawLog || `Tx failed (code ${res.code})`);
    return res;
  } catch (err: any) {
    // WebSocket failed - try REST API broadcast
    if (err?.message?.includes("WebSocket") || err?.message?.includes("protocol") || err?.message?.includes("ws")) {
      try {
        // Sign the transaction
        const signed = await client.sign(sender, msgs, fee, memo);
        const txBytes = client.encodeTx(signed);
        const txBase64 = Buffer.from(txBytes).toString("base64");

        // Broadcast via REST API
        const broadcastRes = await fetch(`/api/rest/cosmos/tx/v1beta1/txs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tx_bytes: txBase64,
            mode: "BROADCAST_MODE_SYNC",
          }),
        });
        const data = await broadcastRes.json();

        if (data?.tx_response?.code !== undefined && data.tx_response.code !== 0) {
          throw new Error(data.tx_response.raw_log || "Tx failed");
        }

        return {
          code: 0,
          transactionHash: data?.tx_response?.txhash || "",
          gasUsed: Number(data?.tx_response?.gas_used || 0),
          gasWanted: Number(data?.tx_response?.gas_wanted || 0),
          height: Number(data?.tx_response?.height || 0),
          rawLog: data?.tx_response?.raw_log || "",
          events: data?.tx_response?.events || [],
        } as unknown as DeliverTxResponse;
      } catch (restErr: any) {
        throw new Error(`Broadcast failed: ${restErr?.message || restErr}`);
      }
    }
    throw err;
  }
}

/**
 * Delegate QIE tokens to a validator
 * Requires: Keplr wallet connected
 */
export async function delegate(validator: string, qieAmount: string) {
  const { sender } = await connect();
  const msg = {
    typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
    value: MsgDelegate.fromPartial({
      delegatorAddress: sender,
      validatorAddress: validator,
      amount: coin(toMicro(qieAmount)),
    }),
  };
  return broadcast([msg], "Delegate via QIE Explorer");
}

/**
 * Undelegate QIE tokens from a validator
 * Requires: Keplr wallet connected
 */
export async function undelegate(validator: string, qieAmount: string) {
  const { sender } = await connect();
  const msg = {
    typeUrl: "/cosmos.staking.v1beta1.MsgUndelegate",
    value: MsgUndelegate.fromPartial({
      delegatorAddress: sender,
      validatorAddress: validator,
      amount: coin(toMicro(qieAmount)),
    }),
  };
  return broadcast([msg], "Undelegate via QIE Explorer");
}

/**
 * Redelegate QIE tokens from one validator to another
 * Requires: Keplr wallet connected
 */
export async function redelegate(srcValidator: string, dstValidator: string, qieAmount: string) {
  const { sender } = await connect();
  const msg = {
    typeUrl: "/cosmos.staking.v1beta1.MsgBeginRedelegate",
    value: MsgBeginRedelegate.fromPartial({
      delegatorAddress: sender,
      validatorSrcAddress: srcValidator,
      validatorDstAddress: dstValidator,
      amount: coin(toMicro(qieAmount)),
    }),
  };
  return broadcast([msg], "Redelegate via QIE Explorer");
}

/**
 * Withdraw all staking rewards
 * Requires: Keplr wallet connected
 */
export async function withdrawAllRewards(validators: string[]) {
  if (!validators.length) throw new Error("No validators with rewards");
  const { sender } = await connect();
  const msgs = validators.map((v) => ({
    typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
    value: MsgWithdrawDelegatorReward.fromPartial({
      delegatorAddress: sender,
      validatorAddress: v,
    }),
  }));
  return broadcast(msgs, "Claim rewards via QIE Explorer");
}

/**
 * Vote on a governance proposal
 * Requires: Keplr wallet connected
 * @param option 1=YES, 2=ABSTAIN, 3=NO, 4=NO_WITH_VETO
 */
export async function voteProposal(proposalId: string | number, option: 1 | 2 | 3 | 4) {
  const { sender } = await connect();
  const msg = {
    typeUrl: "/cosmos.gov.v1beta1.MsgVote",
    value: MsgVote.fromPartial({
      proposalId: BigInt(proposalId) as any,
      voter: sender,
      option,
    }),
  };
  return broadcast([msg], "Vote via QIE Explorer");
}
