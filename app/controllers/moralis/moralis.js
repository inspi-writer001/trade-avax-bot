import Moralis from "moralis";
import { EvmChain } from "@moralisweb3/common-evm-utils";
import dotenv from "dotenv";
import { fromCustomLamport, toCustomLamport } from "../../utils/converters.js";
dotenv.config();

const chain = EvmChain.AVALANCHE;

export const connectToMoralis = async () => {
  await Moralis.start({
    apiKey: process.env.MORALIS_API_KEY
    // ...and any other configuration
  }).then(() => {
    console.log("=====================================");
    console.log("=====================================");
    console.log("connected to moralis successfully");
  });
};

export const fetchTokenBalances = async (address) => {
  console.log(chain);
  const response = await Moralis.EvmApi.token.getWalletTokenBalances({
    address: address,
    chain: chain
  });
  // const response = await Moralis.EvmApi.token.getWalletTokenBalances({
  //   address: "0x0AFB9Ca7445DC12290F87fD8002B00429E875D81" || address,
  //   chain: chain

  // });

  // Create an array of promises to await
  let promises = [];

  // console.log(response.toJSON());
  const balances = response.toJSON();

  let sortedAmount = [];
  // for (let i = 0; i < balances.length; i++) {
  //   if (fromCustomLamport(balances[i].balance, balances[i].decimals) > 0.001) {
  //     sortedAmount.push(balances[i]);
  //   }
  // }
  // return sortedAmount;

  for (let i = 0; i < balances.length; i++) {
    // Create a promise for each balance check
    let promise = new Promise((resolve, reject) => {
      if (
        fromCustomLamport(balances[i].balance, balances[i].decimals) > 0.005
      ) {
        sortedAmount.push(balances[i]);
        resolve(); // Resolve the promise when the condition is met
      } else {
        resolve();
      }
    });

    promises.push(promise);
  }

  // Wait for all promises to resolve before returning sortedAmount
  await Promise.all(promises);

  console.log("sortedAmount");
  console.log(sortedAmount);

  return sortedAmount;
};

export const fetchSpecificTokenBalance = async (address, contractAddress) => {
  const response = await Moralis.EvmApi.token.getWalletTokenBalances({
    address: address,
    tokenAddresses: [contractAddress],
    chain: chain
  });
  // const response = await Moralis.EvmApi.token.getWalletTokenBalances({
  //   address: "0x0AFB9Ca7445DC12290F87fD8002B00429E875D81" || address,
  //   tokenAddresses: [contractAddress],
  //   chain: chain
  // });
  console.log(response.toJSON());
  return response.toJSON();
};
