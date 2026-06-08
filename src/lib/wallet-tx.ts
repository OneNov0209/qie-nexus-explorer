/**
 * Cosmos transaction helpers for QIE (Ethermint-based: coinType 60, eth_secp256k1).
 *
 * Uses Keplr's signAmino + REST API broadcast via /cosmos/tx/v1beta1/txs.
 * This is the same method used by qied CLI - confirmed working.
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

function encodeAminoStdTx(signDoc: any, signature: any): string {
  // Build StdTx in Amino JSON format (same as qied CLI)
  const stdTx = {
    msg: signDoc.msgs,
    fee: signDoc.fee,
    signatures: [
      {
        pub_key: signature.pub_key,
        signature: signature.signature,
      },
    ],
    memo: signDoc.memo || "",
  };

  // Return base64 encoded JSON
  return btoa(JSON.stringify(stdTx));
}

async function signAndBroadcast(
  msgs: { typeUrl: string; value: any }[],
  memo: string
): Promise<DeliverTxResponse> {
  const keplr = await getKeplr();
  const key = await keplr.getKey(NETWORK.cosmosChainId);
  const address = key.bech32Address;

  // Fetch account info
  const accRes = await fetch(
    `/api/rest/cosmos/auth/v1beta1/accounts/${address}`
  ).then((r) => r.json());
  const baseAccount = accRes?.account?.base_account || accRes?.account;
  const accountNumber = String(baseAccount?.account_number || 0);
  const sequence = String(baseAccount?.sequence || 0);

  // Build Amino messages
  const aminoMsgs = msgs.map((m) => ({
    type: m.typeUrl
      .replace("/cosmos.staking.v1beta1.", "cosmos-sdk/")
      .replace("/cosmos.distribution.v1beta1.", "cosmos-sdk/")
      .replace("/cosmos.gov.v1beta1.", "cosmos-sdk/"),
    value: m.value,
  }));

  // Build sign doc
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

  // Sign with Keplr (signAmino - confirmed working)
  const signResult = await keplr.signAmino(
    NETWORK.cosmosChainId,
    address,
    signDoc
  );

  // Encode to base64
  const txBase64 = encodeAminoStdTx(signDoc, signResult.signature);

  // Broadcast via REST API (same method as qied CLI)
  const res = await fetch(`/api/rest/cosmos/tx/v1beta1/txs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_bytes: txBase64,
      mode: "BROADCAST_MODE_SYNC",
    }),
  });
  const data = await res.json();

  // Check for errors
  if (data?.tx_response?.code !== undefined && data.tx_response.code !== 0) {
    throw new Error(data.tx_response.raw_log || "Transaction failed");
  }

  return {
    code: data?.tx_response?.code ?? 0,
    transactionHash: data?.tx_response?.txhash || "",
    gasUsed: Number(data?.tx_response?.gas_used || 0),
    gasWanted: Number(data?.tx_response?.gas_wanted || 0),
    height: Number(data?.tx_response?.height || 0),
    rawLog: data?.tx_response?.raw_log || "",
  };
}

/**
 * Delegate QIE tokens to a validator
 * Requires: Keplr wallet connected
 */
export async function delegate(
  validator: string,
  qieAmount: string
): Promise<DeliverTxResponse> {
  return signAndBroadcast(
    [
      {
        typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
        value: {
          delegator_address: "",
          validator_address: validator,
          amount: coin(toMicro(qieAmount)),
        },
      },
    ],
    "Delegate via QIE Explorer"
  );
}

/**
 * Undelegate QIE tokens from a validator
 * Requires: Keplr wallet connected
 */
export async function undelegate(
  validator: string,
  qieAmount: string
): Promise<DeliverTxResponse> {
  return signAndBroadcast(
    [
      {
        typeUrl: "/cosmos.staking.v1beta1.MsgUndelegate",
        value: {
          delegator_address: "",
          validator_address: validator,
          amount: coin(toMicro(qieAmount)),
        },
      },
    ],
    "Undelegate via QIE Explorer"
  );
}

/**
 * Redelegate QIE tokens from one validator to another
 * Requires: Keplr wallet connected
 */
export async function redelegate(
  srcValidator: string,
  dstValidator: string,
  qieAmount: string
): Promise<DeliverTxResponse> {
  return signAndBroadcast(
    [
      {
        typeUrl: "/cosmos.staking.v1beta1.MsgBeginRedelegate",
        value: {
          delegator_address: "",
          validator_src_address: srcValidator,
          validator_dst_address: dstValidator,
          amount: coin(toMicro(qieAmount)),
        },
      },
    ],
    "Redelegate via QIE Explorer"
  );
}

/**
 * Withdraw all staking rewards
 * Requires: Keplr wallet connected
 */
export async function withdrawAllRewards(
  validators: string[]
): Promise<DeliverTxResponse> {
  const msgs = validators.map((v) => ({
    typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
    value: { delegator_address: "", validator_address: v },
  }));
  return signAndBroadcast(msgs, "Claim rewards via QIE Explorer");
}

/**
 * Vote on a governance proposal
 * Requires: Keplr wallet connected
 * @param option 1=YES, 2=ABSTAIN, 3=NO, 4=NO_WITH_VETO
 */
export async function voteProposal(
  proposalId: string | number,
  option: 1 | 2 | 3 | 4
): Promise<DeliverTxResponse> {
  return signAndBroadcast(
    [
      {
        typeUrl: "/cosmos.gov.v1beta1.MsgVote",
        value: { proposal_id: String(proposalId), voter: "", option },
      },
    ],
    "Vote via QIE Explorer"
  );
}
