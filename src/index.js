import { Token, ChainId } from "@uniswap/sdk";
import { simulateSwapExactIn, buildSwapTxData } from "./uniswapV2sim.js";

async function main() {
  // WETH & USDC (mainnet)
  const WETH = new Token(
    ChainId.MAINNET,
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    18,
    "WETH"
  );
  const USDC = new Token(
    ChainId.MAINNET,
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    6,
    "USDC"
  );

  const sim = await simulateSwapExactIn(WETH, USDC, "0.1", 50); // 0.1 WETH, 0.5% slippage
  console.log("Simulation:", sim);

  const txData = buildSwapTxData(
    WETH,
    USDC,
    "0.1",
    sim.minOut,
    "0x37b5B04740B3614D81e87425aaa1B6350b8867cD",
    10
  );
  console.log("Tx object:", txData);
}

main().catch(console.error);
