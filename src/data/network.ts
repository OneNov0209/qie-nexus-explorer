export const NETWORK = {
  name: "QIE Mainnet",
  chainId: 1990,
  chainIdHex: "0x7C6", // 1990
  cosmosChainId: "qie_1990-1",
  rpc: "https://rpc.qie.onenov.xyz",
  rest: "https://api.qie.onenov.xyz",
  evmRpc: "https://rpc-evm.qie.onenov.xyz",
  evmWs: "wss://ws-evm.qie.onenov.xyz",
  coin: "QIE",
  symbol: "QIE",
  denom: "aqie",
  decimals: 18,
  coinType: 60,
  bech32Prefix: "qie",
  logo: "https://raw.githubusercontent.com/OneNov0209/logo/refs/heads/main/qie-logo.png",
  explorerType: "Hybrid Cosmos + EVM",
} as const;

export const WALLET_LOGOS = {
  metamask: "https://raw.githubusercontent.com/OneNov0209/logo/refs/heads/main/metamask.png",
  keplr: "https://raw.githubusercontent.com/OneNov0209/logo/refs/heads/main/keplr.png",
} as const;

export const FOOTER_LINKS = {
  products: [
    { label: "QIE Blockchain", href: "https://www.qie.digital/" },
    { label: "QIE Wallet", href: "https://www.qiewallet.me/" },
  ],
  developers: [
    { label: "Documentation", href: "https://docs.qie.digital/" },
    { label: "GitHub", href: "https://github.com/qieadmin" },
  ],
  community: [
    { label: "Discord", href: "https://discord.com/invite/8DD4kSHBvr" },
    { label: "Telegram", href: "https://t.me/HovRonQiblockchain" },
    { label: "Reddit", href: "https://reddit.com/r/QIEBlockchain" },
    { label: "Blog", href: "https://www.qiewallet.me/blogs" },
  ],
  hackathon: [
    { label: "Prizes", href: "https://hackathon.qie.digital/#prizes" },
    { label: "FAQ", href: "https://hackathon.qie.digital/#faq" },
  ],
  email: "hello@qie.digital",
};
