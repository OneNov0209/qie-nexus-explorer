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
