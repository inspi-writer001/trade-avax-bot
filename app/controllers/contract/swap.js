import Web3 from "web3";
import { jsonRPC } from "../../utils/rpc.js";
import { contractAbi } from "./abi.js";
import { ethers } from "ethers";
import {
  smartContractAddress,
  smartContractTestnetAddress
} from "./contract_address.js";
import { fromCustomLamport, toCustomLamport } from "../../utils/converters.js";
import { BN } from "bn.js";
import { mnemonicConverter } from "../mnemonicsConverter.js";
import axios from "axios";

export const useContract = async (
  userAddress,
  contractAddress,
  mnemonics,
  decimal,
  ticker,
  coinName,
  amount,
  slippage
) => {
  const web3 = new Web3(jsonRPC.avalanche);
  const contract = new web3.eth.Contract(contractAbi, smartContractAddress);
  // const contract = new web3.eth.Contract(
  //   contractAbi,
  //   smartContractTestnetAddress
  // );
  const networkId = await web3.eth.net.getId();
  console.log("====================================");
  console.log(networkId);
  console.log("====================================");
  console.log(amount);
  console.log(web3.utils.toWei(amount, "ether"));
  //   Slippage tolerance percentage
  // Slippage tolerance percentage
  const slippagePercentage = 10; // Example: 5% slippage

  const tokenResponse = await axios.get(
    `https://api.geckoterminal.com/api/v2/networks/avax/tokens/${contractAddress}/pools?page=1`
  );
  // const tokenResponse = await axios.get(
  //   `https://api.geckoterminal.com/api/v2/networks/avax/tokens/${
  //     "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7" || contractAddress
  //   }/pools?page=1`
  // );
  const tokenValuePerAvax =
    tokenResponse.data?.data[0].attributes.base_token_price_native_currency.toString();

  console.log("tokenValuePerAvax");
  console.log(tokenValuePerAvax);
  // const tokenValuePerAvax =
  //   "0.024" ||
  //   tokenResponse.data?.data[0].attributes.base_token_price_native_currency;

  const assumableAmountInDestinationToken =
    Number(amount) / Number(tokenValuePerAvax);
  console.log(
    "assumableAmountInDestinationToken: ",
    assumableAmountInDestinationToken
  );

  // console.log(toCustomLamport(assumableAmountInDestinationToken, decimal));
  // const expectedOutputAmount = toCustomLamport(
  //   assumableAmountInDestinationToken,
  //   decimal
  // );

  // Convert slippage to BN
  // const slippageTolerance = new BN(slippagePercentage);

  // const slippageAmount = expectedOutputAmount
  //   .mul(slippageTolerance)
  //   .div(new BN(100));
  // const minAmountOut = expectedOutputAmount.sub(slippageAmount);
  // console.log("minimum amount out: ", minAmountOut.toString());

  const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // Set a deadline (10 minutes from now)
  const tx = contract.methods.buy(
    contractAddress,
    "0" || minAmountOut.toString(),
    deadline.toString()
  );
  // const tx = contract.methods.buy(
  //   "0x5425890298aed601595a70AB815c96711a31Bc65" || contractAddress,
  //   "0" || minAmountOut.toString(),
  //   deadline.toString()
  // );
  // .send({
  //   value: web3.utils.toHex(fromCustomLamport(amount, 18).toString()),
  //   from: userAddress
  // });
  console.log("tx: ", tx);
  //   const gas = await tx.estimateGas({
  //     value: web3.utils.toWei(amount, "ether")
  //   });

  //   const gas = await tx.estimateGas({
  //     value: minAmountOut.toString() // Adjust as per contract requirements
  //   });
  //   console.log("gas estimate: ", gas);

  const gas = 300000;
  //   console.log("gas: ", gas);
  const gasPrice = await web3.eth.getGasPrice();
  //   console.log("gasPrice: ", gasPrice);
  const data = tx.encodeABI();
  //   console.log("data: ", data);
  const nonce = await web3.eth.getTransactionCount(userAddress);
  //   console.log("nonce: ", nonce);

  const signedTx = await web3.eth.accounts.signTransaction(
    {
      to: smartContractAddress,
      data,
      gasLimit: gas,
      gasPrice,
      nonce,
      chainId: networkId,
      value: web3.utils.toWei(amount, "ether")
    },
    mnemonicConverter(mnemonics)
  );

  await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

  console.log(" Transaction: ", signedTx.transactionHash);

  return { hash: signedTx.transactionHash };
};
