import axios from "axios";
import { User } from "../db/model.js";
import { PoolData } from "./tradeDataClass.js";
import { fetchSpecificTokenBalance } from "./moralis/moralis.js";
import { fromCustomLamport, toCustomLamport } from "../utils/converters.js";
import { queryNativeBalance } from "./queryBalance.evm.js";
import { fastKeyboard, formatNumber } from "../app.js";

const POINTS = {
  SELL: "sell",
  BUY: "buy"
};

const REWARDS = { sellReward: 3, buyReward: 1 };

export const pointReward = async (
  username,
  contractAddress,
  type,
  amount,
  purchasedValueWAVAX,
  purchasedValueUSD
) => {
  let user = await User.findOne({ username: username });
  console.log("points test sell");
  console.log(user);
  let newAmount;

  switch (type) {
    case POINTS.SELL:
      newAmount =
        user.sellPoints + REWARDS.sellReward * Number(purchasedValueUSD);
      await User.findOneAndUpdate(user._id, { sellPoints: newAmount });
      break;
    case POINTS.BUY:
      // Ensure user.trades[contractAddress] is initialized as an object
      user.trades[contractAddress] = user.trades[contractAddress] || {};

      user.trades[contractAddress].amount = amount;
      user.trades[contractAddress].purchasedValueUSD = purchasedValueUSD;
      user.trades[contractAddress].purchasedValueWAVAX = purchasedValueWAVAX;

      console.log("========= trades ============");
      console.log(user.trades);

      // await user.save();
      await User.findOneAndUpdate(
        { username: username },
        { $set: { trades: user.trades } }
      );

      newAmount =
        user.buyPoints + REWARDS.buyReward * Number(purchasedValueUSD);
      await User.findOneAndUpdate(user._id, { buyPoints: newAmount });
      break;

    default:
      throw new Error({
        error: "ACTION NOT SUPPORTED"
      });
  }
};

// export const resetTrades = async () => {
//   await User.updateMany({ $set: { trades: {} } });
// };

export const portfolioBuyDialog = async (ctx, username, contractAddress) => {
  let user = await User.findOne({ username: username });
  await axios
    .get(
      `https://api.geckoterminal.com/api/v2/networks/avax/tokens/${contractAddress}/pools?page=1`
    )
    .then(async (response) => {
      const wavaxPool = response.data.data.find((pool) =>
        pool.attributes.name.includes("WAVAX")
      );

      if (wavaxPool) {
        console.log("found wavax pool from tradeData.js");
        const poolData = new PoolData(wavaxPool);
        const balance = await fetchSpecificTokenBalance(
          user.address,
          contractAddress
        );
        // get token details
        const response = await axios.get(
          `https://api.geckoterminal.com/api/v2/networks/avax/tokens/${contractAddress}`
        );
        console.log("============ gotBalance");
        console.log(balance);
        const formattedAmount = fromCustomLamport(
          Number(balance[0].balance).toFixed(3),
          balance[0].decimals
        );
        console.log("============ formatted the balance");
        console.log(formattedAmount);
        const avaxBalance = await queryNativeBalance(user.address);
        console.log("============ querried avaxBalance");
        console.log(avaxBalance);
        const message = `<b>🥂✨ ${
          poolData.name
        }  📈✨🥂</b>\n <code>${contractAddress}</code>\n\n
<a href='https://traderjoexyz.com/avalanche/pool/v1/${
          poolData.address
        }/AVAX'>TraderJoe</a> | <a href="https://snowtrace.io/address/${
          poolData.address
        }">Snowtrace</a>\nProfit: ${(
          (user.trades[contractAddress].purchasedValueUSD -
            user.trades[contractAddress].amount *
              (await WavaxPoolTokenPrice(contractAddress))) *
          100
        ).toFixed(3)}%\nMcap: <b>$${formatNumber(
          response.data.data.attributes.market_cap_usd ||
            +response.data.data.attributes.price_usd *
              +response.data.data.attributes.total_supply
        )} </b> \nVolume 24h: <b>${Number(
          response.data.data.attributes.volume_usd.h24
        ).toFixed(3)}%</b>\nBalance: <b>${Number(formattedAmount).toFixed(3)} ${
          response.data.data.attributes.name
        }</b> \nWallet Balance: <b>${avaxBalance} AVAX</b>`;

        await ctx.replyWithHTML(message, fastKeyboard);
      } else {
        console.log("couldn't get wavax pool");
      }
    });
};

export const WavaxPoolTokenPrice = async (contractAddress) => {
  const response = await axios.get(
    `https://api.geckoterminal.com/api/v2/networks/avax/tokens/${contractAddress}/pools?page=1`
  );

  const wavaxPool = response.data.data.find((pool) =>
    pool.attributes.name.includes("WAVAX")
  );

  if (wavaxPool) {
    const poolData = new PoolData(wavaxPool);

    return poolData.baseTokenPriceQuoteToken;
  }
};
export const TokenPricePerAvax = async (contractAddress) => {
  const response = await axios.get(
    `https://api.geckoterminal.com/api/v2/networks/avax/tokens/${contractAddress}/pools?page=1`
  );

  const wavaxPool = response.data.data.find((pool) =>
    pool.attributes.name.includes("WAVAX")
  );

  if (wavaxPool) {
    const poolData = new PoolData(wavaxPool);

    return poolData.quoteTokenPriceBaseToken;
  }
};

// export const addTrade = async (
//   username,
//   contractAddress,
//   purchasedPriceUsd
// ) => {
//   const user = await User.findOne({ username: username });

//   user.trades[contractAddress].
// };
