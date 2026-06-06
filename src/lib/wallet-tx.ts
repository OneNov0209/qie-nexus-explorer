/**
 * Cosmos transaction helpers for QIE (Ethermint-based: coinType 60, eth_secp256k1).
 *
 * Uses Keplr's signDirect + RPC broadcast_tx_sync via proxy.
 * Proto encoding for proper TxRaw format.
 */
import { NETWORK } from "@/data/network";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { TxBody } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { AuthInfo } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { PubKey } from "cosmjs-types/cosmos/crypto/secp256k1/keys";
import { Any } from "cosmjs-types/google/protobuf/any";
import { MsgDelegate } from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { MsgUndelegate } from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { MsgBeginRedelegate } from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { MsgWithdrawDelegatorReward } from "cosmjs-types/cosmos/distribution/v1beta1/tx";
import { MsgVote } from "cosmjs-types/cosmos/gov/v1beta1/tx";

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

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function getKeplr() {
  const w = window as any;
  const keplr = w.keplr;
  if (!keplr) throw new Error("Keplr not detected. Please install Keplr for staking.");
  await keplr.enable(NETWORK.cosmosChainId);
  return keplr;
}

function encodeMsg(typeUrl: string, msg: any): Any {
  let encoded: Uint8Array;
  switch (typeUrl) {
    case "/cosmos.staking.v1beta1.MsgDelegate":
      encoded = MsgDelegate.encode(MsgDelegate.fromPartial(msg)).finish();
      break;
    case "/cosmos.staking.v1beta1.MsgUndelegate":
      encoded = MsgUndelegate.encode(MsgUndelegate.fromPartial(msg)).finish();
      break;
    case "/cosmos.staking.v1beta1.MsgBeginRedelegate":
      encoded = MsgBeginRedelegate.encode(MsgBeginRedelegate.fromPartial(msg)).finish();
      break;
    case "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward":
      encoded = MsgWithdrawDelegatorReward.encode(MsgWithdrawDelegatorReward.fromPartial(msg)).finish();
      break;
    case "/cosmos.gov.v1beta1.MsgVote":
      encoded = MsgVote.encode(MsgVote.fromPartial(msg)).finish();
      break;
    default:
      throw new Error("Unknown message type: " + typeUrl);
  }
  return Any.fromPartial({
    typeUrl: typeUrl,
    value: encoded,
  });
}

async function signAndBroadcast(msgs: { typeUrl: string; value: any }[], memo: string): Promise<DeliverTxResponse> {
  const keplr = await getKeplr();
  const key = await keplr.getKey(NETWORK.cosmosChainId);
  const address = key.bech32Address;

  // Fetch account info
  const accRes = await fetch(`/api/rest/cosmos/auth/v1beta1/accounts/${address}`).then(r => r.json());
  const baseAccount = accRes?.account?.base_account || accRes?.account;
  const accountNumber = Number(baseAccount?.account_number || 0);
  const sequence = Number(baseAccount?.sequence || 0);

  // Encode messages to Any[]
  const anyMsgs = msgs.map(m => encodeMsg(m.typeUrl, m.value));

  // Build TxBody
  const txBody = TxBody.fromPartial({
    messages: anyMsgs,
    memo: memo,
  });
  const bodyBytes = TxBody.encode(txBody).finish();

  // Build AuthInfo
  const pubKeyValue = key.pubkey || new Uint8Array();
  const authInfo = AuthInfo.fromPartial({
    signerInfos: [{
      publicKey: Any.fromPartial({
        typeUrl: "/ethermint.crypto.v1.ethsecp256k1.PubKey",
        value: PubKey.encode(PubKey.fromPartial({ key: pubKeyValue })).finish(),
      }),
      modeInfo: {
        single: { mode: SignMode.SIGN_MODE_DIRECT },
      },
      sequence: BigInt(sequence),
    }],
    fee: {
      amount: [{ denom: NETWORK.denom, amount: "6250000000000000" }],
      gasLimit: BigInt(250000),
    },
  });
  const authInfoBytes = AuthInfo.encode(authInfo).finish();

  // SignDoc
  const signDoc = {
    chainId: NETWORK.cosmosChainId,
    accountNumber: String(accountNumber),
    authInfoBytes: authInfoBytes,
    bodyBytes: bodyBytes,
  };

  // Sign with Keplr
  const signResult = await keplr.signDirect(NETWORK.cosmosChainId, address, signDoc);

  // Build TxRaw
  const txRaw = TxRaw.fromPartial({
    bodyBytes: signResult.signed.bodyBytes,
    authInfoBytes: signResult.signed.authInfoBytes,
    signatures: [fromBase64(signResult.signature.signature)],
  });

  const txBytes = TxRaw.encode(txRaw).finish();
  const txBase64 = toBase64(txBytes);

  // Broadcast via RPC
  const res = await fetch(`/api/rpc/broadcast_tx_sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "broadcast_tx_sync",
      params: { tx: txBase64 },
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
  return signAndBroadcast([{
    typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
    value: {
      delegatorAddress: "",
      validatorAddress: validator,
      amount: coin(toMicro(qieAmount)),
    },
  }], "Delegate via QIE Explorer");
}

export async function undelegate(validator: string, qieAmount: string): Promise<DeliverTxResponse> {
  return signAndBroadcast([{
    typeUrl: "/cosmos.staking.v1beta1.MsgUndelegate",
    value: {
      delegatorAddress: "",
      validatorAddress: validator,
      amount: coin(toMicro(qieAmount)),
    },
  }], "Undelegate via QIE Explorer");
}

export async function redelegate(srcValidator: string, dstValidator: string, qieAmount: string): Promise<DeliverTxResponse> {
  return signAndBroadcast([{
    typeUrl: "/cosmos.staking.v1beta1.MsgBeginRedelegate",
    value: {
      delegatorAddress: "",
      validatorSrcAddress: srcValidator,
      validatorDstAddress: dstValidator,
      amount: coin(toMicro(qieAmount)),
    },
  }], "Redelegate via QIE Explorer");
}

export async function withdrawAllRewards(validators: string[]): Promise<DeliverTxResponse> {
  const msgs = validators.map(v => ({
    typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
    value: { delegatorAddress: "", validatorAddress: v },
  }));
  return signAndBroadcast(msgs, "Claim rewards via QIE Explorer");
}

export async function voteProposal(proposalId: string | number, option: 1 | 2 | 3 | 4): Promise<DeliverTxResponse> {
  return signAndBroadcast([{
    typeUrl: "/cosmos.gov.v1beta1.MsgVote",
    value: { proposalId: BigInt(proposalId), voter: "", option },
  }], "Vote via QIE Explorer");
}
