import Web3 from "web3";
import { User } from "../db/model.js";
import { jsonRPC } from "../utils/rpc.js";

export const queryNativeBalance = async (walletAddress, rpc) => {
  const web3 = new Web3(rpc || jsonRPC.avalanche);
  let balance = await web3.eth.getBalance(walletAddress); // Use 'await' to get the balance asynchronously.
  balance = web3.utils.fromWei(balance, "ether"); // Convert the balance from Wei to Ether.
  return balance.length > 2 ? Number(balance).toFixed(4) : balance;
};

export const checkBalance = async (username) => {
  const response = await User.find({ username });

  return await queryNativeBalance(response[0].address, jsonRPC.avalanche);
};
