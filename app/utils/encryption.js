import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const secret = process.env.SECRET_INIT;
const initVector = process.env.INIT_VECTOR;

export const encrypt = (mnemonic) => {
  const cipher = crypto.createCipheriv("aes256", secret, initVector);
  const mnemonic_e =
    cipher.update(mnemonic, "utf8", "hex") + cipher.final("hex");

  return mnemonic_e;
};

export const decrypt = (encrypted) => {
  let decipher = crypto.createDecipheriv("aes256", secret, initVector);
  let word =
    decipher.update(encrypted.toString(), "hex", "utf8") +
    decipher.final("utf8");

  return word;
};
