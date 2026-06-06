/**
 * Cosmos transaction helpers for QIE (Ethermint-based: coinType 60, eth_secp256k1).
 *
 * Uses Keplr's signDirect + REST API broadcast via proxy.
 * No WebSocket needed, no CORS issues.
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

// Build Amino message JSON (Ethermint requires Amino format)
function buildAminoMsg(type: string, value: any) {
  return { type, value };
}

// Build SignDoc for signDirect
function buildSignDoc(address: string, accountNumber: string, sequence: string, msgs: any[], fee: any, memo: string) {
  const bodyBytes = encodeBodyBytes(msgs, memo);
  const authInfoBytes = encodeAuthInfoBytes(fee);
  
  return {
    chainId: NETWORK.cosmosChainId,
    accountNumber: accountNumber,
    authInfoBytes: authInfoBytes,
    bodyBytes: bodyBytes,
  };
}

// Simple body encoding (Amino JSON)
function encodeBodyBytes(msgs: any[], memo: string): Uint8Array {
  const bodyJson = JSON.stringify({ messages: msgs, memo });
  return new TextEncoder().encode(bodyJson);
}

function encodeAuthInfoBytes(fee: any): Uint8Array {
  return new Uint8Array(0); // Will be filled by Keplr
}

async function signAndBroadcast(msgs: any[], memo: string): Promise<DeliverTxResponse> {
  const keplr = await getKeplr();
  const key = await keplr.getKey(NETWORK.cosmosChainId);
  const address = key.bech32Address;

  // Fetch account info
  const accRes = await fetch(`/api/rest/cosmos/auth/v1beta1/accounts/${address}`).then(r => r.json());
  const baseAccount = accRes?.account?.base_account || accRes?.account;
  const accountNumber = String(baseAccount?.account_number || 0);
  const sequence = String(baseAccount?.sequence || 0);

  // Build amino messages
  const aminoMsgs = msgs.map(m => {
    if (m.typeUrl) {
      const type = m.typeUrl.replace("/cosmos.staking.v1beta1.", "cosmos-sdk/").replace("/cosmos.distribution.v1beta1.", "cosmos-sdk/").replace("/cosmos.gov.v1beta1.", "cosmos-sdk/");
      return buildAminoMsg(type, {
        delegator_address: m.value.delegatorAddress || m.value.delegator_address,
        validator_address: m.value.validatorAddress || m.value.validator_address,
        validator_src_address: m.value.validatorSrcAddress || m.value.validator_src_address,
        validator_dst_address: m.value.validatorDstAddress || m.value.validator_dst_address,
        amount: m.value.amount,
        proposal_id: m.value.proposalId?.toString(),
        voter: m.value.voter,
        option: m.value.option,
      });
    }
    return m;
  });

  const fee = { amount: [{ denom: NETWORK.denom, amount: "6250000000000000" }], gas: "250000" };

  // Sign with signDirect
  const signDoc = {
    chainId: NETWORK.cosmosChainId,
    accountNumber: accountNumber,
    authInfoBytes: new Uint8Array([18, 11, 10, 9, 10, 4, 97, 113, 105, 101, 18, 1, 48]), // basic auth info
    bodyBytes: encodeBodyBytes(aminoMsgs, memo),
  };

  const signResult = await keplr.signDirect(NETWORK.cosmosChainId, address, signDoc);

  // Build signed tx for broadcast
  const signedTx = {
    body_bytes: Buffer.from(signResult.signed.bodyBytes).toString("base64"),
    auth_info_bytes: Buffer.from(signResult.signed.authInfoBytes).toString("base64"),
    signatures: [Buffer.from(signResult.signature.signature, "base64").toString("base64")],
  };

  const txBytes = Buffer.from(JSON.stringify({
    body: { messages: aminoMsgs, memo },
    auth_info: { signer_infos: [], fee },
    signatures: [signResult.signature.signature],
  })).toString("base64");

  // Broadcast via REST
  const broadcastRes = await fetch(`/api/rest/cosmos/tx/v1beta1/txs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tx_bytes: txBytes, mode: "BROADCAST_MODE_SYNC" }),
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
    rawLog: "",
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
