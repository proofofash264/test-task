import {
  ChainId,
  Token,
  TokenAmount,
  Pair,
  Route,
  Trade,
  TradeType,
  Percent,
} from "@uniswap/sdk";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const RPC = process.env.RPC_URL || "https://mainnet.infura.io/v3/YOUR_KEY";
const provider = new ethers.JsonRpcProvider(RPC);

/**
 * Build a Pair object by fetching reserves from chain
 */
export async function fetchPair(tokenA, tokenB) {
  const pairAddress = Pair.getAddress(tokenA, tokenB);
  const reservesAbi = [
    "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function token0() external view returns (address)",
  ];
  const contract = new ethers.Contract(pairAddress, reservesAbi, provider);

  const [reserve0, reserve1] = await contract.getReserves();
  const token0 = await contract.token0();

  const [reserveA, reserveB] =
    tokenA.address.toLowerCase() === token0.toLowerCase()
      ? [reserve0, reserve1]
      : [reserve1, reserve0];

  return new Pair(
    new TokenAmount(tokenA, reserveA.toString()),
    new TokenAmount(tokenB, reserveB.toString())
  );
}

/**
 * Simulate a swap
 */
export async function simulateSwapExactIn(
  tokenIn,
  tokenOut,
  amountIn, // human amount as string
  slippageBps
) {
  const pair = await fetchPair(tokenIn, tokenOut);
  const route = new Route([pair], tokenIn, tokenOut);

  const trade = new Trade(
    route,
    new TokenAmount(
      tokenIn,
      ethers.parseUnits(amountIn, tokenIn.decimals).toString()
    ),
    TradeType.EXACT_INPUT
  );

  // slippage tolerance
  const slippageTolerance = new Percent(slippageBps.toString(), "10000");

  const amountOutMin = trade.minimumAmountOut(slippageTolerance).toExact();
  const executionPrice = trade.executionPrice.toSignificant(6);
  const nextMidPrice = trade.nextMidPrice.toSignificant(6);

  return {
    expectedOut: trade.outputAmount.toExact(),
    minOut: amountOutMin,
    executionPrice,
    nextMidPrice,
    priceImpact: trade.priceImpact.toSignificant(6),
  };
}

/**
 * Build swap tx calldata for Uniswap V2 Router
 */
export function buildSwapTxData(
  tokenIn,
  tokenOut,
  amountIn,
  minOut,
  to,
  deadlineMinutes
) {
  const routerAbi = [
    "function swapExactTokensForTokens(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline)",
  ];
  const router = new ethers.Interface(routerAbi);

  const deadline = Math.floor(Date.now() / 1000) + deadlineMinutes * 60;

  const data = router.encodeFunctionData("swapExactTokensForTokens", [
    ethers.parseUnits(amountIn, tokenIn.decimals),
    ethers.parseUnits(minOut, tokenOut.decimals),
    [tokenIn.address, tokenOut.address],
    to,
    deadline,
  ]);

  return {
    to: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap V2 Router
    data,
    value: "0x0",
  };
}
