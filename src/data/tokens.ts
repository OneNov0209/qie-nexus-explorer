export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
  isNative?: boolean;
}

export const DEX_SUBGRAPH = "https://graphql.qie.digital/subgraphs/name/qie-dex/dex";

export const DEX_ROUTER = "0x08cd2e72e156D8563B4351eb4065C262A9f553Ef";
export const DEX_FACTORY = "0x8E23128a5511223bE6c0d64106e2D4508C08398C";
export const WQIE_ADDRESS = "0x0087904D95BEe9E5F24dc8852804b547981A9139";

export const TOKENS: Token[] = [
  {
    address: "0x0000000000000000000000000000000000000000",
    symbol: "QIE",
    name: "QIE Mainnet",
    decimals: 18,
    isNative: true,
    logo: "https://raw.githubusercontent.com/OneNov0209/logo/refs/heads/main/qie-logo.png",
  },
  {
    address: WQIE_ADDRESS,
    symbol: "wQIE",
    name: "Wrapped QIE",
    decimals: 18,
    logo: "https://raw.githubusercontent.com/OneNov0209/logo/refs/heads/main/qie-logo.png",
  },
  {
    address: "0x0e93facc0a2cfd418403f3ad3eefb5c8b2dfaec7",
    symbol: "wUSDC",
    name: "wUSDC.eth",
    decimals: 6,
    logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  },
  {
    address: "0xcb7bbc584475dce754a918ccd92ff6e0211f3cee",
    symbol: "wUSDT",
    name: "wUSDT.eth",
    decimals: 6,
    logo: "https://cryptologos.cc/logos/tether-usdt-logo.png",
  },
  {
    address: "0x3f43da82ec9a4f5285f10faf1f26eca7319e5da5",
    symbol: "QUSDC",
    name: "QUSDC",
    decimals: 6,
    logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  },
  {
    address: "0x45a2d82c24ca1285ab84737750072b27091b87b2",
    symbol: "QSTK",
    name: "QiStake",
    decimals: 18,
    logo: "https://raw.githubusercontent.com/OneNov0209/logo/refs/heads/main/qie-logo.png",
  },
  {
    address: "0x4f8cd460ea2dbd9805b1f8b79305615b6746ae56",
    symbol: "BUBB",
    name: "Bubble Bunies",
    decimals: 18,
    logo: "https://raw.githubusercontent.com/OneNov0209/logo/refs/heads/main/qie-logo.png",
  },
  {
    address: "0xA795c4D885522d5e37956265837636b023445871",
    symbol: "QIDEX",
    name: "QIDEX Token",
    decimals: 18,
    logo: "https://raw.githubusercontent.com/OneNov0209/logo/refs/heads/main/qie-logo.png",
  },
];

export function getToken(address: string): Token | undefined {
  return TOKENS.find((t) => t.address.toLowerCase() === address.toLowerCase());
}
