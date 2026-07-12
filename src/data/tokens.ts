export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
  isNative?: boolean;
}

export const DEX_SUBGRAPH = "https://graphql.qie.digital/subgraphs/name/qie-dex/dex";

// 🔥 KONTRAK RESMI QIEDEX
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
    address: "0x0e93FAcc0a2cfD418403f3AD3EEfB5C8b2dfAec7",
    symbol: "wUSDC",
    name: "Wrapped USDC",
    decimals: 6,
    logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  },
  {
    address: "0xCB7bBC584475dce754a918ccD92FF6E0211f3CEE",
    symbol: "wUSDT",
    name: "Wrapped USDT",
    decimals: 6,
    logo: "https://cryptologos.cc/logos/tether-usdt-logo.png",
  },
  {
    address: WQIE_ADDRESS,
    symbol: "wQIE",
    name: "Wrapped QIE",
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
