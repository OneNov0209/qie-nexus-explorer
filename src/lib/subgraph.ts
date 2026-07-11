import { DEX_SUBGRAPH } from "@/data/tokens";

export async function querySubgraph<T>(query: string): Promise<T> {
  const response = await fetch(DEX_SUBGRAPH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();
  if (data.errors) {
    throw new Error(data.errors[0].message);
  }
  return data.data as T;
}

export async function getTopPairs(limit: number = 10) {
  const query = `
    {
      pairs(first: ${limit}, orderBy: volumeUSD, orderDirection: desc) {
        id
        token0 {
          id
          symbol
          name
          decimals
        }
        token1 {
          id
          symbol
          name
          decimals
        }
        reserve0
        reserve1
        volumeUSD
        token0Price
        token1Price
        totalSupply
      }
    }
  `;
  const result = await querySubgraph<{ pairs: any[] }>(query);
  return result.pairs;
}

export async function getTokens() {
  const query = `
    {
      tokens(first: 100) {
        id
        name
        symbol
        decimals
        totalSupply
        tradeVolume
        totalLiquidity
      }
    }
  `;
  const result = await querySubgraph<{ tokens: any[] }>(query);
  return result.tokens;
}

export async function getPairPrice(token0Address: string, token1Address: string) {
  const query = `
    {
      pairs(where: {
        token0: "${token0Address.toLowerCase()}",
        token1: "${token1Address.toLowerCase()}"
      }) {
        id
        token0Price
        token1Price
        reserve0
        reserve1
        volumeUSD
      }
    }
  `;
  const result = await querySubgraph<{ pairs: any[] }>(query);
  return result.pairs[0] || null;
}
