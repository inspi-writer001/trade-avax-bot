import { ethers } from "ethers";

// Mnemonic phrase

export const mnemonicConverter = (mnemonic) => {
  const wallet = ethers.Wallet.fromPhrase(mnemonic);
  const privateKey = wallet.privateKey;
  return privateKey;
};
