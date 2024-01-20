// import BN from "bn.js";
import { ethers } from "ethers";
export const toCustomLamport = (amount, decimals) => {
  // const value = 1 * Math.pow(10, Number(decimals)) * amount;
  const value = ethers.parseUnits(
    Number(amount).toFixed(3).toString(),
    decimals
  );
  return value;
};

export const fromCustomLamport = (amount, decimals) => {
  return amount / (1 * Math.pow(10, Number(decimals)));
};
// export const toCustomLamport = (amount, decimals) => {
//   return 1 * Math.pow(10, Number(decimals)) * amount;
// };

// export const fromCustomLamport = (amount, decimals) => {
//   return amount / (1 * Math.pow(10, Number(decimals)));
// };
