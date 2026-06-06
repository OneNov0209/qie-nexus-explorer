/**
 * Cosmos transaction helpers for QIE (Ethermint-based: coinType 60, eth_secp256k1).
 *
 * IMPORTANT: Staking operations (delegate, undelegate, redelegate, withdraw rewards,
 * vote) are ONLY available via Cosmos wallet (QIE Wallet Cosmos mode / Keplr).
 * MetaMask & QIE Wallet EVM mode are for EVM transfers only - NOT for staking.
 *
 * Uses offline signer + REST API broadcast via proxy (no WebSocket needed, no CORS).
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

async function getSignerAndAddress(): Promise<{ signer: any; address: string }> {
  const w = window as any;
  // Support QIE Wallet (if it exposes keplr API), Keplr, Leap
  const provider = w.qie || w.keplr || w.leap;
  if (!provider) throw new Error("No Cosmos wallet detected. Please install Keplr for staking operations.");

  await provider.enable(NETWORK.cosmosChainId);

  // Use Amino signer for Ethermint compatibility
  const signer = provider.getOfflineSignerOnlyAmino
    ? provider.getOfflineSignerOnlyAmino(NETWORK.cosmosChainId)
    : provider.getOfflineSigner(NETWORK.cosmosChainId);

  const accounts = await signer.getAccounts();
  if (!accounts[0]) throw new Error("No account found in wallet");

  return { signer, address: accounts[0].address };
}

const DEFAULT_FEE = {
  amount: [{ denom: NETWORK.denom, amount: "6250000000000000" }],
  gas: "250000",
};

async function signAndBroadcast(
  address: string,
  messages: any[],
  memo: string,
  signer: any
): Promise<DeliverTxResponse> {
  // Fetch account info for sequence
  const accRes = await fetch(`/api/rest/cosmos/auth/v1beta1/accounts/${address}`).then(r => r.json());
  const baseAccount = accRes?.account?.base_account || accRes?.account;
  const accountNumber = Number(baseAccount?.account_number || 0);
  const sequence = Number(baseAccount?.sequence || 0);

  // Build sign doc for Amino signing
  const signDoc = {
    chain_id: NETWORK.cosmosChainId,
    account_number: String(accountNumber),
    sequence: String(sequence),
    fee: DEFAULT_FEE,
    msgs: messages,
    memo: memo,
  };

  // Sign with wallet
  const signResponse = await signer.signAmino(address, signDoc);

  // Build signed transaction
  const signedTx = {
    msg: messages,
    fee: DEFAULT_FEE,
    signatures: [
      {
        pub_key: {
          type: "tendermint/PubKeySecp256k1",
          value: signResponse.signature.pub_key?.value || "",
        },
        signature: signResponse.signature.signature || signResponse.signature,
      },
    ],
    memo: memo,
  };

  // Encode to base64
  const txBytes = btoa(JSON.stringify(signedTx));

  // Broadcast via REST API proxy
  const broadcastRes = await fetch(`/api/rest/cosmos/tx/v1beta1/txs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_bytes: txBytes,
      mode: "BROADCAST_MODE_SYNC",
    }),
  });

  const data = await broadcastRes.json();

  // Check for errors
  if (data?.tx_response?.code !== undefined && data.tx_response.code !== 0) {
    throw new Error(data.tx_response.raw_log || "Transaction failed");
  }

  // Check for broadcast error
  if (data?.code && data?.code !== 0) {
    throw new Error(data?.message || "Broadcast failed");
  }

  return {
    code: 0,
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
export async function delegate(validator: string, qieAmount: string): Promise<DeliverTxResponse> {
  const { signer, address } = await getSignerAndAddress();
  const msg = {
    type: "cosmos-sdk/MsgDelegate",
    value: {
      delegator_address: address,
      validator_address: validator,
      amount: coin(toMicro(qieAmount)),
    },
  };
  return signAndBroadcast(address, [msg], "Delegate via QIE Explorer", signer);
}

/**
 * Undelegate QIE tokens from a validator
 * Requires: Keplr wallet connected
 */
export async function undelegate(validator: string, qieAmount: string): Promise<DeliverTxResponse> {
  const { signer, address } = await getSignerAndAddress();
  const msg = {
    type: "cosmos-sdk/MsgUndelegate",
    value: {
      delegator_address: address,
      validator_address: validator,
      amount: coin(toMicro(qieAmount)),
    },
  };
  return signAndBroadcast(address, [msg], "Undelegate via QIE Explorer", signer);
}

/**
 * Redelegate QIE tokens from one validator to another
 * Requires: Keplr wallet connected
 */
export async function redelegate(srcValidator: string, dstValidator: string, qieAmount: string): Promise<DeliverTxResponse> {
  const { signer, address } = await getSignerAndAddress();
  const msg = {
    type: "cosmos-sdk/MsgBeginRedelegate",
    value: {
      delegator_address: address,
      validator_src_address: srcValidator,
      validator_dst_address: dstValidator,
      amount: coin(toMicro(qieAmount)),
    },
  };
  return signAndBroadcast(address, [msg], "Redelegate via QIE Explorer", signer);
}

/**
 * Withdraw all staking rewards
 * Requires: Keplr wallet connected
 */
export async function withdrawAllRewards(validators: string[]): Promise<DeliverTxResponse> {
  if (!validators.length) throw new Error("No validators with rewards");
  const { signer, address } = await getSignerAndAddress();
  const msgs = validators.map((v) => ({
    type: "cosmos-sdk/MsgWithdrawDelegationReward",
    value: {
      delegator_address: address,
      validator_address: v,
    },
  }));
  return signAndBroadcast(address, msgs, "Claim rewards via QIE Explorer", signer);
}

/**
 * Vote on a governance proposal
 * Requires: Keplr wallet connected
 * @param option 1=YES, 2=ABSTAIN, 3=NO, 4=NO_WITH_VETO
 */
export async function voteProposal(proposalId: string | number, option: 1 | 2 | 3 | 4): Promise<DeliverTxResponse> {
  const { signer, address } = await getSignerAndAddress();
  const msg = {
    type: "cosmos-sdk/MsgVote",
    value: {
      proposal_id: String(proposalId),
      voter: address,
      option: option,
    },
  };
  return signAndBroadcast(address, [msg], "Vote via QIE Explorer", signer);
}
