import { ethers } from "ethers";

export const isWalletValid = (address) => {
  try {
    return ethers.isHexString(address);
    // return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};
