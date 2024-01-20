import Web3 from "web3";
import { jsonRPC } from "../../utils/rpc.js";

import { contractAbi } from "./abi.js";
import { fromCustomLamport, toCustomLamport } from "../../utils/converters.js";
import { mnemonicConverter } from "../mnemonicsConverter.js";
import { fetchSpecificTokenBalance } from "../moralis/moralis.js";

import { BN } from "bn.js";
import { ethers } from "ethers";
import {
  smartContractAddress,
  smartContractTestnetAddress
} from "./contract_address.js";
import { TokenPricePerAvax, WavaxPoolTokenPrice } from "../tradeData.js";

const router_mainnet_address = "0x60aE616a2155Ee3d9A68541Ba4544862310933d4";
const router_fuji_address = "0xd7f655E3376cE2D7A2b08fF01Eb3B1023191A901";

const tokenABI = [
  // Standard ERC-20 functions
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address recipient, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function _decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function _symbol() view returns (string)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

// 0xA089a21902914C3f3325dBE2334E9B466071E5f1 testnet usdte
// 0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7 testnet usdc

// weth 0xd8b917cf32022e35E09Bac2c6F16a64fa7D1DEC9
// usdt on tradderjoe  0xAb231A5744C8E6c45481754928cCfFFFD4aa0732

export const sellContract = async (
  userAddress,
  contractAddress,
  mnemonics,
  decimal,
  ticker,
  coinName,
  amount,
  slippage,
  percent,
  ctx,
  username
) => {
  const web3 = new Web3(jsonRPC.avalanche);

  const responseBalance = await fetchSpecificTokenBalance(
    userAddress,
    contractAddress
  );
  console.log("userBalance from moralis");
  console.log(responseBalance);
  // const responseBalance = await fetchSpecificTokenBalance(
  //   "0x0AFB9Ca7445DC12290F87fD8002B00429E875D81" || userAddress,
  //   "0x2f6f07cdcf3588944bf4c42ac74ff24bf56e7590" || contractAddress
  // );

  const userBalance = fromCustomLamport(
    responseBalance[0].balance,
    responseBalance[0].decimals
  ).toFixed(3);

  // const userBalance = 0.213;

  const amountToSell = toCustomLamport(amount, responseBalance[0].decimals);
  console.log("amount to sell in its decimals");
  console.log(amountToSell);

  const settledBalance =
    percent === true
      ? toCustomLamport(
          (amount / 100) * Number(userBalance).toFixed(3),
          responseBalance[0].decimals
        )
      : amountToSell;
  const settledBalanceForApprove =
    percent === true ? (amount / 100) * Number(userBalance).toFixed(3) : amount;

  console.log("userBalance =====", userBalance);
  console.log("settled balance ====", settledBalance);

  // const erc20 = new web3.eth.Contract(erc20Abi, contractAddress);

  console.log(
    "perceived amount:    ",
    toCustomLamport(responseBalance[0].decimals).toString()
  );
  // console.log(
  //   "perceived amount:    ",
  //   toCustomLamport(settledBalance, 6 || responseBalance[0].decimals).toString()
  // );

  // const myBalance = await erc20.methods
  //   .balanceOf(userAddress)
  //   .call({ from: userAddress });
  // console.log("myBalance: ", myBalance);

  console.log("=========== approve tx =========");

  const approveTx = await olaideApprove(
    mnemonicConverter(mnemonics),
    contractAddress,
    smartContractAddress,
    settledBalanceForApprove,
    decimal
  );

  //  ===========================================

  // const approveTx = await olaideApprove(
  //   mnemonicConverter(mnemonics),
  //   "0xB6076C93701D6a07266c31066B298AeC6dd65c2d" || contractAddress,
  //   smartContractTestnetAddress
  // );

  await ctx.reply(" === we're still on it 💌 === ");

  //  0xd8b917cf32022e35E09Bac2c6F16a64fa7D1DEC9

  console.log("approveTx", approveTx);

  const sellContract = new web3.eth.Contract(contractAbi, smartContractAddress);

  const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // Set a deadline (10 minutes from now)

  const ethersProvider = new ethers.JsonRpcProvider(jsonRPC.avalanche);
  const walletInstance = new ethers.Wallet(
    mnemonicConverter(mnemonics),
    ethersProvider
  );
  const contract = new ethers.Contract(
    smartContractAddress,
    [
      "function sell(address _tokenIn, uint256 amountOutMin, uint256 amountInMax, uint256 deadline)"
    ],
    walletInstance
  );

  console.log("tx got here ============");

  const tx = await contract.sell(
    contractAddress,
    "0",
    settledBalance.toString(),
    deadline
  );
  // const tx = await contract.sell(
  //   "0xB6076C93701D6a07266c31066B298AeC6dd65c2d" || contractAddress,
  //   "0",
  //   "2300",
  //   deadline
  // );

  console.log("erc20Sign.transactionHash");
  const result = await tx.wait();

  console.log(" ================= result =================");
  // console.log(result);
  console.log(result.hash);
  return { hash: result.hash };

  // await web3.eth.sendSignedTransaction(sellSign.rawTransaction);
};

const olaideApprove = async (
  privateKey,
  tokenAddress,
  operator,
  amountInAvax,
  decimals
) => {
  const provider = new ethers.JsonRpcProvider(jsonRPC.avalanche);
  const walletInstance = new ethers.Wallet(privateKey, provider);
  const amountToApprove = (
    Number(await TokenPricePerAvax(tokenAddress)) * Number(amountInAvax)
  ).toFixed(3);
  const amountToApproveInCustomLamport = toCustomLamport(
    amountToApprove,
    decimals
  );
  const max = amountToApproveInCustomLamport.toString();
  // const max = ethers.MaxUint256;
  const contract = new ethers.Contract(tokenAddress, tokenABI, walletInstance);
  const tx = await contract.approve(operator, max);
  return await tx.wait();
};

const getAmountsOut = async (
  routerAddress,
  privateKey,
  amountIn,
  tokenIn,
  tokenOut
) => {
  const router = new ethers.Contract(
    routerAddress,
    [
      "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
      "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)"
    ],
    privateKey
  );

  const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
};

// const proxy = new web3.eth.Contract(
//   proxyAbi,
//   "0x5425890298aed601595a70AB815c96711a31Bc65" || contractAddress
// );

// const proxy = new web3.eth.Contract(proxyAbi, contractAddress);
// const implementationAddress = await getImplementationAddress(
//   web3.currentProvider,
//   contractAddress
// );

// const responseBalance = await fetchSpecificTokenBalance(
//   userAddress,
//   contractAddress
// );

// function sell(address _tokenIn, uint256 amountOutMin, uint256 amountInMax, uint256 deadline)
// const sellTx = sellContract.methods.sell(
//   "0x5425890298aed601595a70AB815c96711a31Bc65" || contractAddress,
//   "2300",
//   "0",
//   deadline
// );

// const networkId = await web3.eth.net.getId();

// const gas = 3000000;
// // 3000000
// const erc20GasPrice = await web3.eth.getGasPrice();
// const sellData = sellTx.encodeABI();
// const ercNonce = await web3.eth.getTransactionCount(userAddress);

// /////////////////////////////////////////////////////////////////////////////////
// const sellSign = await web3.eth.accounts.signTransaction(
//   {
//     data: sellData,
//     gasLimit: gas,
//     gasPrice: erc20GasPrice,
//     nonce: ercNonce,
//     chainId: networkId,
//     from: userAddress
//   },
//   mnemonicConverter(mnemonics)
// );
