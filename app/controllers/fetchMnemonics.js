import { User } from "../db/model.js";
import { decrypt } from "../utils/encryption.js";

export const fetchMnemonics = async (username) => {
  const response = await User.find({ username });

  return decrypt(response[0].encrypted_mnemonics);
};
