import { User } from "../db/model.js";
import { makeid } from "../utils/genId.js";
import { jsonRPC } from "../utils/rpc.js";
import { createWallet12 } from "./createWallet.js";
import { queryNativeBalance } from "./queryBalance.evm.js";

const log = console.log;

export const createUser = async (username, referralCode) => {
  const existing_user = await User.find({ username });
  log(existing_user);

  if (referralCode) {
    const referredBy = await User.find({
      referralCode
    });
    if (referredBy.length > 0 && username !== referredBy[0].username) {
      if (!referredBy[0].referrals.includes(username)) {
        referredBy[0].referrals.push(username);
        await referredBy[0].save();
      } else {
        console.log("user already exists");
      }
    } else {
      return new Error("you cannot refer yourself");
    }
  }

  if (existing_user.length > 0) {
    const balance = await queryNativeBalance(
      existing_user[0].address,
      jsonRPC.avalanche
    );
    if (!existing_user[0].referralCode) {
      const referralCode = `tab_${makeid(8)}`;
      existing_user[0].referralCode = referralCode;
      await User.findByIdAndUpdate(existing_user[0]._id, {
        referralCode
      });
    }
    return {
      address: existing_user[0].address,
      balance: balance,
      encrypted_mnemonics: existing_user[0].encrypted_mnemonics,
      _id: existing_user[0]._id
    };
  } else {
    const new__user = await createWallet12();

    const balance = await queryNativeBalance(
      new__user.addresses.avalanche.address,
      jsonRPC.avalanche
    );

    const referralCode = `tab_${makeid(8)}`;

    const saveUser = new User({
      encrypted_mnemonics: new__user.encrypted_mnemonic,
      address: new__user.addresses.avalanche.address,
      username: username,
      referralCode: referralCode
    });

    await saveUser.save();
    return {
      address: new__user.addresses.avalanche.address,
      balance: balance,
      encrypted_mnemonics: new__user.encrypted_mnemonic,
      _id: saveUser._id
    };
  }
};
