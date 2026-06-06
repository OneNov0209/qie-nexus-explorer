/**
 * Cosmos transaction helpers for QIE (Ethermint-based: coinType 60, eth_secp256k1).
 *
 * Uses Keplr's offline signer + cosmjs SigningStargateClient. We register the
 * Ethermint pubkey type URL so the AuthInfo encodes correctly.
 */
import { SigningStargateClient, defaultRegistryTypes, GasPrice, calculateFee, type DeliverTxResponse } from "@cosmjs/stargate";
import { Registry } from "@cosmjs/proto-signing";
import { PubKey } from "cosmjs-types/cosmos/crypto/secp256k1/keys";
import { MsgDelegate, MsgUndelegate, MsgBeginRedelegate } from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { MsgWithdrawDelegatorReward } from "cosmjs-types/cosmos/distribution/v1beta1/tx";
import { MsgVote } from "cosmjs-types/cosmos/gov/v1beta1/tx";
import { NETWORK } from "@/data/network";

const ETH_PUBKEY_TYPE = "/ethermint.crypto.v1.ethsecp256k1.PubKey";

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
  const client = await SigningStargateClient.connectWithSigner(NETWORK.rpc, signer, {
    registry: makeRegistry(),
    gasPrice: GasPrice.fromString(`25000000000${NETWORK.denom}`),
  });
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
  const res = await client.signAndBroadcast(sender, msgs, fee, memo);
  if (res.code !== 0) throw new Error(res.rawLog || `Tx failed (code ${res.code})`);
  return res;
}

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
