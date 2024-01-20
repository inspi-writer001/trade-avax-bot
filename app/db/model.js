// models.js

import mongoose from "mongoose";

const tradeSchema = {
  amount: { type: Number, default: 0 },
  purchasedValueUSD: { type: Number, default: 0 },
  purchasedValueWAVAX: { type: Number, default: 0 }
};

const userSchema = new mongoose.Schema({
  // chatId: {
  //   type: Number,
  //   required: true
  // },
  encrypted_mnemonics: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  trades: {
    type: {},
    default: {
      amount: 0,
      purchasedValueUSD: 0,
      purchasedValueWAVAX: 0
    }
  },
  sellPoints: {
    type: Number,
    default: 0
  },
  buyPoints: {
    type: Number,
    default: 0
  },
  joinPoint: {
    type: Number,
    default: 30
  },
  referrals: {
    type: [String],
    default: []
  },
  referralCode: String
});

export const User = mongoose.model("User", userSchema);
