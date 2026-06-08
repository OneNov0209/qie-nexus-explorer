/**
 * Cosmos transaction helpers for QIE (Ethermint-based: coinType 60, eth_secp256k1).
 *
 * Uses Keplr's signAmino + broadcast via /api/broadcast proxy.
 * Confirmed working with qied CLI format.
 */
import { NETWORK } from "@/data/network";

type DeliverTxResponse = {
  code: number;
  transactionHash: string;
  gasUsed: number;
  gasWanted: number;
  height: number;
  rawLog: string;
};

function coin(amount: string | number) {
  return { denom: NETWORK.denom, amount: String(amount) };
}

export function toMicro(qie: string | number): string {
  const n = typeof qie === "string" ? Number(qie) : qie;
  if (!isFinite(n) || n <= 0) throw new Error("Invalid amount");
  return (BigInt(Math.floor(n * 1e6)) * BigInt(1e12)).toString();
}

async function getKeplr() {
  const w = window as any;
  const keplr = w.keplr;
  if (!keplr) throw new Error("Keplr not detected. Please install Keplr for staking.");
  await keplr.enable(NETWORK.cosmosChainId);
  return keplr;
}

function toHex(str: string): string {
  return Array.from(new TextEncoder().encode(str))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signAndBroadcast(
  msgs: { typeUrl: string; value: any }[],
  memo: string
): Promise<DeliverTxResponse> {
  const keplr = await getKeplr();
  const key = await keplr.getKey(NETWORK.cosmosChainId);
  const address = key.bech32Address;

  const accRes = await fetch(`/api/rest/cosmos/auth/v1beta1/accounts/${address}`).then((r) => r.json());
  const baseAccount = accRes?.account?.base_account || accRes?.account;
  const accountNumber = String(baseAccount?.account_number || 0);
  const sequence = String(baseAccount?.sequence || 0);

  const aminoMsgs = msgs.map((m) => ({
    type: m.typeUrl
      .replace("/cosmos.staking.v1beta1.", "cosmos-sdk/")
      .replace("/cosmos.distribution.v1beta1.", "cosmos-sdk/")
      .replace("/cosmos.gov.v1beta1.", "cosmos-sdk/"),
    value: m.value,
  }));

  const signDoc = {
    chain_id: NETWORK.cosmosChainId,
    account_number: accountNumber,
    sequence: sequence,
    fee: {
      amount: [{ denom: NETWORK.denom, amount: "6250000000000000" }],
      gas: "250000",
    },
    msgs: aminoMsgs,
    memo: memo,
  };

  const signResult = await keplr.signAmino(NETWORK.cosmosChainId, address, signDoc);

  // Build Amino StdTx
  const aminoTx = {
    type: "cosmos-sdk/StdTx",
    value: {
      msg: signDoc.msgs,
      fee: signDoc.fee,
      signatures: [
        {
          pub_key: signResult.signature.pub_key,
          signature: signResult.signature.signature,
        },
      ],
      memo: signDoc.memo,
    },
  };

  const txHex = toHex(JSON.stringify(aminoTx));

  // Broadcast via dedicated endpoint
  const res = await fetch(`/api/broadcast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "broadcast_tx_sync",
      params: { tx: "0x" + txHex },
    }),
  });
  const data = await res.json();

  if (data?.result?.code !== 0) {
    throw new Error(data?.result?.log || "Transaction failed");
  }

  return {
    code: 0,
    transactionHash: data?.result?.hash || "",
    gasUsed: Number(data?.result?.gas_used || 0),
    gasWanted: Number(data?.result?.gas_wanted || 0),
    height: Number(data?.result?.height || 0),
    rawLog: data?.result?.log || "",
  };
}

export async function delegate(validator: string, qieAmount: string): Promise<DeliverTxResponse> {
  return signAndBroadcast(
    [{ typeUrl: "/cosmos.staking.v1beta1.MsgDelegate", value: { delegator_address: "", validator_address: validator, amount: coin(toMicro(qieAmount)) } }],
    "Delegate via QIE Explorer"
  );
}

export async function undelegate(validator: string, qieAmount: string): Promise<DeliverTxResponse> {
  return signAndBroadcast(
    [{ typeUrl: "/cosmos.staking.v1beta1.MsgUndelegate", value: { delegator_address: "", validator_address: validator, amount: coin(toMicro(qieAmount)) } }],
    "Undelegate via QIE Explorer"
  );
}

export async function redelegate(srcValidator: string, dstValidator: string, qieAmount: string): Promise<DeliverTxResponse> {
  return signAndBroadcast(
    [{ typeUrl: "/cosmos.staking.v1beta1.MsgBeginRedelegate", value: { delegator_address: "", validator_src_address: srcValidator, validator_dst_address: dstValidator, amount: coin(toMicro(qieAmount)) } }],
    "Redelegate via QIE Explorer"
  );
}

export async function withdrawAllRewards(validators: string[]): Promise<DeliverTxResponse> {
  const msgs = validators.map((v) => ({ typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward", value: { delegator_address: "", validator_address: v } }));
  return signAndBroadcast(msgs, "Claim rewards via QIE Explorer");
}

export async function voteProposal(proposalId: string | number, option: 1 | 2 | 3 | 4): Promise<DeliverTxResponse> {
  return signAndBroadcast(
    [{ typeUrl: "/cosmos.gov.v1beta1.MsgVote", value: { proposal_id: String(proposalId), voter: "", option } }],
    "Vote via QIE Explorer"
  );
}
