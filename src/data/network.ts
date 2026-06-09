export const NETWORK = {
  name: "QIE Mainnet",
  chainId: 1990,
  chainIdHex: "0x7C6",
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
    { label: "QIE Wallet", href: "https://qiewallet.me/" },
    { label: "QIE Pass", href: "https://qiepass.qie.digital/" },
    { label: "QIE Domains", href: "https://domains.qie.digital/" },
    { label: "QIE DEX", href: "https://www.dex.qie.digital/#/stake" },
    { label: "QIE Lottery", href: "https://lottery.qie.digital/" },
    { label: "QIE Doodle", href: "https://qiedoodle.com/" },
    { label: "QIE Lend", href: "https://www.qielend.qie.digital/" },
  ],
  developers: [
    { label: "Documentation", href: "https://docs.qie.digital/" },
    { label: "Developer Portal", href: "https://www.qie.digital/developer#" },
    { label: "GitHub", href: "https://github.com/qieadmin" },
    { label: "IBC Explorer", href: "/ibc" },
    { label: "Chain Parameters", href: "/parameters" },
  ],
  ecosystem: [
    { label: "QIE Bridge", href: "https://bridge.qie.digital/" },
    { label: "QBots Trade", href: "https://www.qbots.trade/" },
    { label: "Pawsome Host", href: "https://www.pawsome.host/" },
  ],
  community: [
    { label: "X (Twitter)", href: "https://x.com/qieblockchain" },
    { label: "Telegram", href: "https://t.me/HovRonQiblockchain" },
    { label: "Discord", href: "https://discord.com/invite/8DD4kSHBvr" },
    { label: "Facebook", href: "https://www.facebook.com/QiBlockchain" },
    { label: "Instagram", href: "https://www.instagram.com/qieblockchain.online/" },
    { label: "Reddit", href: "https://www.reddit.com/r/qiblockchain/?rdt=58368" },
  ],
  company: [
    { label: "About", href: "https://www.qie.digital/developer#" },
    { label: "Blog", href: "https://www.qie.digital/blog" },
    { label: "Medium", href: "https://medium.com/@QIEecosystem/" },
    { label: "Contact", href: "mailto:info@qiewallet.me" },
  ],
  legal: [
    { label: "Terms of Service", href: "https://www.qie.digital/terms-of-services" },
    { label: "Privacy Policy", href: "https://www.qie.digital/terms-of-services" },
  ],
  email: "info@qiewallet.me",
}
