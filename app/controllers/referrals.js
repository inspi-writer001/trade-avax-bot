import { User } from "../db/model.js";

export const fetchReferralCount = async (username) => {
  const response1 = await User.find({ username });
  const response = await User.find({ referralCode: response1[0].referralCode });
  console.log(response);

  return {
    referralCount: response[0].referrals.length,
    referralCode: response1[0].referralCode
  };
};

export const fetchReferralCode = async (username) => {
  const response = await User.find({ username });

  return response[0].referralCode;
};
