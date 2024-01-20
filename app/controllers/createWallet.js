// import { initWasm, TW, KeyStore } from "@trustwallet/wallet-core";
import { encrypt } from "../utils/encryption.js";
import { ethers } from "ethers";

export const createWallet12 = async () => {
  const wallet = ethers.Wallet.createRandom();
  const seedPhrase = wallet.mnemonic.phrase;
  const address = wallet.address;
  return {
    encrypted_mnemonic: encrypt(seedPhrase),
    addresses: {
      avalanche: { address }
    }
  };
};

// console.log("====================================");
// console.log(await createWallet12());
// console.log("====================================");
// console.log("====================================");
