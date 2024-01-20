import { User } from "../db/model.js";

export const fetchUser = async (username) => {
  const response = await User.find({ username });

  return {
    username: response[0].username,
    address: response[0].address,
    user: response[0]
  };
};
