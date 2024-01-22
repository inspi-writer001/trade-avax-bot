import { Telegraf, session, Markup } from "telegraf";
// import { message } from "telegraf/filters";
import { Redis } from "@telegraf/session/redis";
import dotenv from "dotenv";
import { connectToMongo } from "./db/config.js";

import { createUser } from "./controllers/createUser.js";
import {
  fetchReferralCode,
  fetchReferralCount
} from "./controllers/referrals.js";
import { fetchMnemonics } from "./controllers/fetchMnemonics.js";
import { checkBalance } from "./controllers/queryBalance.evm.js";
import { isWalletValid } from "./utils/isWalletValid.js";
import axios from "axios";
import numeral from "numeral";
import { fetchUser } from "./controllers/fetchUser.js";
import { decrypt } from "./utils/encryption.js";

import { useContract } from "./controllers/contract/swap.js";
import {
  connectToMoralis,
  fetchSpecificTokenBalance,
  fetchTokenBalances
} from "./controllers/moralis/moralis.js";
import { fromCustomLamport } from "./utils/converters.js";
import { sellContract } from "./controllers/contract/sell.js";
import { mnemonicConverter } from "./controllers/mnemonicsConverter.js";
import { AvaxPrice, tokenPrice } from "./utils/AvaxPrice.js";
import { txError } from "./errors/txError.js";
import {
  WavaxPoolTokenPrice,
  pointReward,
  portfolioBuyDialog
} from "./controllers/tradeData.js";

dotenv.config();

// helper function to format number

export const formatNumber = (number) => {
  return numeral(+number).format("00.00a");
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const state = {};
const sellState = {};
const usersAwaitingAmount = [];
const usersAwaitingSell = [];
const lastRequestTimes = {};
const sellAddress = {};
const buyAddress = {};

// Bot token from environment variable
const bot = new Telegraf(process.env.INSP_TELEGRAM);

//Redis session middleware
try {
  const store = Redis({ url: process.env.REDIS_URL });
  bot.use(session({ store }));
} catch (error) {
  console.log(error);
}

try {
  connectToMoralis();
} catch (error) {
  console.error("moralis connection error");
  console.error(error);
}
// prevent users from spamming bot ------> restricts concurrent requests to 3 seconds interval
bot.use((ctx, next) => {
  const userId = ctx.from.id;

  // Check if the user has made a recent request
  if (
    lastRequestTimes[userId] &&
    Date.now() - lastRequestTimes[userId] < 2000
  ) {
    ctx.reply("⏳ Please wait 2 seconds before sending another request.");
    return;
  }

  // Update the timestamp for the user's request
  lastRequestTimes[userId] = Date.now();

  // Continue to the next middleware or handler
  next();
});

// Connect to MongoDB
connectToMongo();
// Markup.button.callback("📁 Import wallet ", "button9")

export const fastKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("🟢 Buy ", "button1"),
    Markup.button.callback("🔁 Refresh ", "restart"),
    Markup.button.callback("🔴 Sell", "sell")
  ]
]);

const inlineKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("🟢 Buy ", "button1"),
    Markup.button.callback("🔁 Refresh ", "restart"),
    Markup.button.callback("🔴 Sell", "sell")
  ],
  [Markup.button.callback("🔺 Buy $TAB ", "buyTab")],
  [Markup.button.callback("🔻 Withdraw $TAB ", "sellTab")],
  [
    Markup.button.callback("🔫 Sniper ", "comingSoon"),
    Markup.button.callback("💌 ref count ", "button10"),
    Markup.button.callback("🏦 Balance ", "button6")
  ],
  [
    Markup.button.callback("💰 Ref code ", "button7"),
    Markup.button.callback("🔑 Mnemonics ", "button8")
  ]
]);

// Handler for /start messages
bot.start(async (ctx) => {
  let username = ctx.chat?.username;

  if (!username && ctx.from && ctx.from.id) {
    username = ctx.from.id.toString();
  }
  try {
    // const username =
    //   ctx.update.message.from.username || ctx.update.message.from.first_name;
    // method to extract referral code from command
    console.log("=======================");
    console.log(ctx.message.text);
    const referred = ctx.message.text?.split(" ")[1]?.trim();
    console.log(referred);
    console.log("=======================");

    const response = await createUser(username, referred);

    const welcome =
      `
    <b>▰ Hi ${username}, welcome to TradeAvaxBot</b>\n` +
      `
    <b>═══ Your Wallet ═══</b>
    ▰ Avax
    Balance: ${response.balance}🔺⬩$${await AvaxPrice(response.balance)}
    Address:` +
      `
    <code>${response.address}</code>
    `;

    await ctx.replyWithHTML(welcome, inlineKeyboard);
  } catch (error) {
    console.log(error);
    const ErrorMessage = `Hi ${username}, Something went wrong,

${
  error.toString().includes("timed out")
    ? "Your request Timed out😵‍💫, please try again in a min"
    : "That's strange 🤔, please give us a minute"
}`;

    await ctx.reply(ErrorMessage, inlineKeyboard);
  }
});

// handles main menu
bot.action("mainMenu", async (ctx) => {
  let username = ctx.chat?.username;

  if (!username && ctx.from && ctx.from.id) {
    username = ctx.from.id.toString();
  }

  // method to extract referral code from command

  console.log("=======================");
  try {
    const response = await createUser(username);
    const welcome =
      `
    <b>▰ Hi ${username}, welcome to TradeAvaxBot</b>\n` +
      `
    <b>═══ Your Wallet ═══</b>
    ▰ Avax
    Balance: ${response.balance}🔺⬩$${await AvaxPrice(response.balance)}
    Address:` +
      `
    <code>${response.address}</code>
    `;

    await ctx.replyWithHTML(welcome, inlineKeyboard);
  } catch (error) {
    console.log(error);
    const ErrorMessage = `
    Hi ${username}, Something went wrong,

    🥲 Looks like this =====
    ${
      error.toString().includes("timed out")
        ? "Your request Timed out😵‍💫, please try again in a min"
        : "That's strange 🤔, please give us a minute"
    }`;
    await ctx.reply(ErrorMessage, inlineKeyboard);
  }
});

// bot.action("buyMenu", async (ctx) => {
//   try {
//     const user = ctx.chat.username;
//     const userDetails = await fetchUser(user);
//     const buyInstruction = `🛠 Buy Tokens - Set your buy settings using the menu below, then enter the token address to buy. Using high slippage may result in frontrun or sandwich attacks.

// Supported dexes: Traderjoe

//     -Buy Amount: the amt of AVAX to spend
//     -Slippage: Definition
// ⬩ Block: 39068328 ⬩ AVAX: $39.52`;

//     const mainBuy = Markup.inlineKeyboard([
//       [
//         Markup.button.callback("⏮ Main Menu ", "mainMenu"),
//         Markup.button.callback("❌ Close ", "vanish")
//       ],
//       [Markup.button.callback(" Wallet Address ", "hh")],
//       [Markup.button.callback(`${userDetails.address}`, "hf")],
//       [Markup.button.callback("⚡️ Buy X", "buyCustom")],
//       [Markup.button.callback("📊 Chart ", "chart")]
//     ]);

//     await ctx.reply(buyInstruction, mainBuy);
//   } catch (error) {
//     console.log(error);
//     const newError = async () => {
//       await ctx.reply(`🥲 oh snap, something went wrong, let's try again`);
//       await bot.start();
//     };
//     newError();
//   }
// });

const sellMethod = async (username, userInput, ctx, Markup) => {};

bot.action("buyTab", async (ctx) => {
  let username = ctx.chat?.username;
  if (!username && ctx.from && ctx.from.id) {
    username = ctx.from.id.toString();
  }

  try {
    // let continueListening = true;

    // if (continueListening){
    //  let username = ctx.chat?.username;
    //  if (!username && ctx.from && ctx.from.id) {
    //    username = ctx.from.id.toString();
    //  }
    let userInput = "0x84F3d3fC36DD94fFBca05eA3d848F5c844867C93";

    console.log("userInput");
    console.log(userInput);
    isWalletValid(userInput) &&
      (await axios
        .get(
          `https://api.geckoterminal.com/api/v2/networks/avax/tokens/${userInput}`
        )
        .then(async (response) => {
          console.log(response.data);

          const message = `
<b>🥂✨ ${response.data.data.attributes.name} ($${
            response.data.data.attributes.symbol
          }) 📈✨🥂</b>\n<code>${
            response.data.data.attributes.address
          }</code>\n\n
<a href='https://traderjoexyz.com/avalanche/pool/v1/${
            response.data.data.attributes.address
          }/AVAX'>TraderJoe</a> | <a href="https://snowtrace.io/address/${
            response.data.data.attributes.address
          }">Snowtrace</a>\n
<b>General</b>
<pre><code>🔺 Price         | $${response.data.data.attributes.price_usd}
</code>\n<code>📊 Market Cap    | $${formatNumber(
            response.data.data.attributes.market_cap_usd ||
              +response.data.data.attributes.price_usd *
                +response.data.data.attributes.total_supply
          )}</code>\n<code>
📈 FDV           | $${formatNumber(response.data.data.attributes.fdv_usd)}
</code>\n<code>🗄 Total Supply  | ${formatNumber(
            response.data.data.attributes.total_supply
          )} ${response.data.data.attributes.symbol}</code>
</pre>
`;

          const buyOptions = Markup.inlineKeyboard([
            [
              Markup.button.callback("⚡️ Buy 0.5 ", "0.5"),
              Markup.button.callback("⚡️ Buy 5 ", "5"),
              Markup.button.callback("⚡️ Buy X", "buy_custom")
            ],
            [
              Markup.button.callback("⏪ Buy Menu ", "button1"),
              Markup.button.callback("⏮ Main Menu ", "mainMenu")
            ],
            [
              Markup.button.url(
                "📊 Chart ",
                `https://dexscreener.com/avalanche/${userInput}`
              ),
              Markup.button.callback("❌ Close ", "vanish")
            ]
          ]);

          await ctx.replyWithHTML(message);
          await ctx.reply(`🎉 we found it ✨`, buyOptions);

          let awaitingCustomValue = false;
          let customValue = null;
          userInput = "";

          buyAddress[username] = response.data.data;

          // Further processing with the custom value...

          // await ctx.replyWithMarkdownV2(buyOptions);
        })
        .catch(async (error) => {
          const buyOptions = Markup.inlineKeyboard([
            [
              Markup.button.callback("⏪ Buy Menu ", "button1"),
              Markup.button.callback("⏮ Main Menu ", "mainMenu")
            ],
            [
              Markup.button.url(
                "📊 Chart ",
                `https://dexscreener.com/avalanche/${userInput}`
              ),
              Markup.button.callback("❌ Close ", "vanish")
            ]
          ]);
          await ctx.reply(
            `😵‍💫 that looks like a valid address, but we couldn't find any tokens ✨`,
            buyOptions
          );
        }));

    // }

    // let currentUser = ctx.chat.username;
    let currentUser = ctx.chat?.username;
    if (!currentUser && ctx.from && ctx.from.id) {
      currentUser = ctx.from.id.toString();
    }

    const customValue = ctx.message.text;

    usersAwaitingAmount.includes(currentUser)
      ? await customBuyForSpecificUser(currentUser, customValue, ctx)
      : usersAwaitingSell.includes(currentUser) &&
        (await customSellForSpecificUser(currentUser, customValue, ctx));
  } catch (error) {
    console.log(error);
  }
});

bot.action("sellTab", async (ctx) => {
  try {
    // let continueListening = true;

    // if (continueListening){

    let username = ctx.chat?.username;
    if (!username && ctx.from && ctx.from.id) {
      username = ctx.from.id.toString();
    }
    let userInput = "0x84f3d3fc36dd94ffbca05ea3d848f5c844867c93";

    console.log("userInputhere");
    console.log(userInput);
    isWalletValid(userInput) &&
      (await axios
        .get(
          `https://api.geckoterminal.com/api/v2/networks/avax/tokens/${userInput}`
        )
        .then(async (response) => {
          console.log(response.data);

          const message = `
<b>🥂✨ ${response.data.data.attributes.name} ($${
            response.data.data.attributes.symbol
          }) 📈✨🥂</b>\n<code>${
            response.data.data.attributes.address
          }</code>\n\n
<a href='https://traderjoexyz.com/avalanche/pool/v1/${
            response.data.data.attributes.address
          }/AVAX'>TraderJoe</a> | <a href="https://snowtrace.io/address/${
            response.data.data.attributes.address
          }">Snowtrace</a>\n
<b>General</b>
<pre><code>🔺 Price         | $${response.data.data.attributes.price_usd}
</code>\n<code>📊 Market Cap    | $${formatNumber(
            response.data.data.attributes.market_cap_usd ||
              +response.data.data.attributes.price_usd *
                +response.data.data.attributes.total_supply
          )}</code>\n<code>
📈 FDV           | $${formatNumber(response.data.data.attributes.fdv_usd)}
</code>\n<code>🗄 Total Supply  | ${formatNumber(
            response.data.data.attributes.total_supply
          )} ${response.data.data.attributes.symbol}</code>
</pre>
`;

          const sellOptions = Markup.inlineKeyboard([
            [
              Markup.button.callback("⚡️ Sell 50% ", "50p"),
              Markup.button.callback("⚡️ Sell 100% ", "100p"),
              Markup.button.callback("⚡️ Sell X", "sell_custom")
            ],
            [
              Markup.button.callback("⏪ Open Positions ", "sell"),
              Markup.button.callback("⏮ Main Menu ", "mainMenu")
            ],
            [
              Markup.button.url(
                "📊 Chart ",
                `https://dexscreener.com/avalanche/${userInput}`
              ),
              Markup.button.callback("❌ Close ", "vanish")
            ]
          ]);

          await ctx.replyWithHTML(message);
          await ctx.reply(`🎉 we found it ✨`, sellOptions);

          let awaitingCustomValue = false;
          let customValue = null;
          userInput = "";

          sellAddress[username] = response.data.data;
          bot.action("sleep", async (ctx) => {
            console.log("sleep");
            ctx.answerCbQuery("hello");
          });

          // Further processing with the custom value...

          // await ctx.replyWithMarkdownV2(buyOptions);
        })
        .catch(async (error) => {
          const buyOptions = Markup.inlineKeyboard([
            [
              Markup.button.callback("⏪ Buy Menu ", "button1"),
              Markup.button.callback("⏮ Main Menu ", "mainMenu")
            ],
            [
              Markup.button.callback(
                "📊 Chart ",
                `https://dexscreener.com/avalanche/${userInput}`
              ),
              Markup.button.callback("❌ Close ", "vanish")
            ]
          ]);
          await ctx.reply(
            `😵‍💫 that looks like a valid address, but we couldn't find any tokens ✨`,
            buyOptions
          );
        }));

    // }
    return;
    // let currentUser = ctx.chat.username;

    // const customValue = ctx.message.text;

    // usersAwaitingSell.includes(currentUser) &&
    //   (await customSellForSpecificUser(currentUser, customValue, ctx));
  } catch (error) {
    console.log(error);
  }
});

// handles fetch current open pairs for sell

bot.action("sell", async (ctx) => {
  let username = ctx.chat?.username;
  if (!username && ctx.from && ctx.from.id) {
    username = ctx.from.id.toString();
  }

  try {
    const userAddress = await fetchUser(username);

    const walletBalances = await fetchTokenBalances(userAddress.address);

    walletBalances.length > 0
      ? await ctx.reply(
          `here are your open orders, 
we only show token balances above 0.005 units`,
          Markup.inlineKeyboard(
            walletBalances.map((e) => {
              console.log(fromCustomLamport(e.balance, e.decimals));
              // if (!e.possible_spam) {
              return Markup.button.callback(
                `${fromCustomLamport(e.balance, e.decimals).toFixed(3)} ${
                  e.symbol
                }`.toString(),
                `${e.token_address}`
              );
              // }
            }),
            { columns: 2 }
          )
        )
      : await ctx.reply(
          "No open Positions",
          Markup.inlineKeyboard([
            [Markup.button.callback("❌ Close ", "vanish")]
          ])
        );
  } catch (error) {
    console.error(error);
  }
});

// handle close

bot.action("vanish", async (ctx) => {
  try {
    const chatId = ctx.chat.id;

    // console.log("=======================");
    // console.log(ctx.callbackQuery.message.message_id);
    // Get the ID of the last message in the chat
    const messageId = ctx.callbackQuery.message.message_id; // Adjust the message ID as needed

    if (messageId > 0) {
      // Delete the last message using the deleteMessage method
      await ctx.telegram.deleteMessage(chatId, messageId);

      // Notify the user that the message has been deleted
      // await ctx.reply("Message evaporated!");
    } else {
      await ctx.reply("No previous message to delete.");
    }
  } catch (error) {
    console.error("Error deleting message:", error);
    // await ctx.reply("Failed to delete the message.");
  }
});

// handle fetch user referral count

bot.action("button7", async (ctx) => {
  let username = ctx.chat?.username;
  if (!username && ctx.from && ctx.from.id) {
    username = ctx.from.id.toString();
  }
  try {
    const referralCode = await fetchReferralCode(username);
    const message =
      "<pre>  ═══ 💰 Referral code ═══ </pre>\n\n" +
      "<b>🚀🚀Here's your referral code!</b>\n" +
      `<code>${referralCode}</code>\n\n` +
      "<b>🗒 copy this and share to the world 💪✨</b>\n" +
      `<code>https://t.me/TradeAvax_Bot?start=${referralCode}</code>`;
    await ctx.replyWithHTML(message);
  } catch (error) {
    console.log(error);
  }
});

// prompt sell instruction

bot.action("button1", async (ctx) => {
  await ctx.reply(" 📑 paste token contract address here. 👇");
});

// handle referral count

bot.action("button10", async (ctx) => {
  let username = ctx.chat?.username;
  if (!username && ctx.from && ctx.from.id) {
    username = ctx.from.id.toString();
  }
  try {
    const referralCount = await fetchReferralCount(username);
    const message =
      "\n\n" +
      "<pre> ═══  💌 Referral count  ═══ </pre>\n\n" +
      "<b>🚀🚀 Here's how many people are using your referral code:</b>\n" +
      `🪄✨ <code>${referralCount.referralCount}</code>\n\n` +
      "<b>🗒 Let's keep sharing to the world 💪✨</b>\n" +
      `<code>https://t.me/TradeAvax_Bot?start=${referralCount.referralCode}</code>\n`;
    await ctx.replyWithHTML(message);
  } catch (error) {
    console.log(error);
  }
});

// handle fetch balance
bot.action("button6", async (ctx) => {
  let username = ctx.chat?.username;
  if (!username && ctx.from && ctx.from.id) {
    username = ctx.from.id.toString();
  }
  try {
    const queryBalance = await checkBalance(username);
    const user = await fetchUser(username);
    const message =
      "\n\n" +
      "<pre> ═══  🏦 Balance  ═══ </pre>\n\n" +
      "🚀🚀 You're doing great, here's your balance:\n\n" +
      `<b>$AVAX: ${queryBalance}</b>🔺⬩$${await AvaxPrice(queryBalance)}\n` +
      `<b>$TAB: 0 </b>🔺⬩$0.00\n` +
      `<b>$POINTS: ${
        Number((await fetchReferralCount(username)).referralCount) * 5 || 0
      }</b> from Referrals🔺⬩$0.00\n<b>$POINTS: ${Number(
        user.user?.sellPoints
      ).toFixed(3)}</b> from SELL orders🔺⬩$0.00\n<b>$POINTS: ${Number(
        user.user?.buyPoints
      ).toFixed(
        3
      )}</b> from BUY orders🔺⬩$0.00\n<b>$POINTS: ${"0"}</b> from ONRAMP🔺⬩$0.00\n<b>$POINTS: ${Number(
        user.user?.joinPoint
      ).toFixed(3)}</b> Welcome Bonus🔺⬩$0.00`;
    await ctx.replyWithHTML(message, fastKeyboard);
  } catch (error) {
    console.log(error);
  }
});

// handle restart bot action

const restartFunction = async (ctx) => {
  let username = ctx.chat?.username;
  if (!username && ctx.from && ctx.from.id) {
    username = ctx.from.id.toString();
  }
  try {
    console.log("===========  refresh  ============");

    const response = await createUser(username);

    const welcome =
      `
    <b>▰ welcome back ${username} </b>\n` +
      `
    <b>═══ Your Wallet ═══</b>
    ▰ Avax
    Balance: ${response.balance}🔺⬩$${await AvaxPrice(response.balance)}
    Address:` +
      `
    <code>${response.address}</code>
    `;

    await ctx.replyWithHTML(welcome, inlineKeyboard);
  } catch (error) {
    console.log(error);
    const ErrorMessage = `Hi ${username}, Something went wrong,

${
  error.toString().includes("timed out")
    ? "Your request Timed out😵‍💫, please try again in a min"
    : "That's strange 🤔, please give us a minute"
}`;

    await ctx.reply(ErrorMessage, inlineKeyboard);
  }
};

bot.action("restart", async (ctx) => {
  try {
    // Gracefully stop the bot
    await ctx.reply("♻️ restarting bot ....");

    let username = ctx.chat?.username;
    if (!username && ctx.from && ctx.from.id) {
      username = ctx.from.id.toString();
    }
    delete sellState[username];
    delete state[username];
    await restartFunction(ctx);
  } catch (error) {
    console.log("error occured in restarting bot");
  }
  // Start a new instance of the bot after a delay (for example, 2 seconds)
  // setTimeout(async () => {
  //   await bot.launch();
  //   // Notify the user that the bot has been refreshed and is now active again
  //   await ctx.reply("🔄 Bot has been refreshed and is now active!");
  //   await ctx.reply("🚀 yup, we're up again 🥂✨, thank you", inlineKeyboard);
  // }, 3000); // 2 seconds delay
});

// handle privateKey import
bot.action("button8", async (ctx) => {
  let username = ctx.chat?.username;
  if (!username && ctx.from && ctx.from.id) {
    username = ctx.from.id.toString();
  }
  const userMnemonic = await fetchMnemonics(username);
  try {
    const key =
      `<pre><b> ═══ 🔑 Your Mnemonics ═══</b></pre>\n` +
      ` 🔒 Make sure to keep it safe\n\n` +
      `<span class="tg-spoiler"><code>${userMnemonic}</code></span>\n\n` +
      `<b> Your wallet may support Private key only 🪄👇, </b>\n\n` +
      `<span class="tg-spoiler"><code>${mnemonicConverter(
        userMnemonic
      )}</code></span>\n`;
    await ctx.replyWithHTML(key, fastKeyboard);
  } catch (error) {
    console.log(error);
  }
});

// Handler for 'button9' (Import wallet) action
bot.action("button9", async (ctx) => {
  try {
    let continueListening = true;

    // Prompt the user to send their seed phrase or private key
    await ctx.reply("Please paste your seed phrase or private key.");

    // Listen for the user's message with their seed phrase or private key
    bot.on("text", async (ctx) => {
      try {
        if (continueListening) {
          const userInput = ctx.message.text;

          // Process the user's seed phrase or private key (you can perform validation or other actions here)
          // For example, you might want to save it to a database or perform specific actions

          // Reply to the user acknowledging receipt of the seed phrase or private key
          await ctx.reply(
            "Seed phrase or private key received. Thank you!",
            inlineKeyboard
          );

          // Set continueListening to false to stop further message processing
          continueListening = false;
        }
      } catch (error) {
        console.error(error);
      }
    });
  } catch (error) {
    console.error(error);
  }
});

// coming soon features
bot.action("comingSoon", async (ctx) => {
  try {
    const message =
      "🎉 Exciting news! We are working on that new feature. Stay tuned! 🚀";

    // Send the message to the user
    await ctx.reply(message, fastKeyboard);
  } catch (error) {
    console.log(error);
  }
});

// buy options

bot.action(["0.5", "5", "buy_custom"], async (ctx) => {
  try {
    console.log(ctx.match[0]);
    console.log("nigga pressed it");
    // const amountToBuy = "5";
    const amountToBuy = ctx.match[0].toString();
    let user = ctx.chat?.username;
    if (!user && ctx.from && ctx.from.id) {
      user = ctx.from.id.toString();
    }

    let response = buyAddress[user];

    const currentUser = await createUser(user);
    const userAddress = currentUser.address;
    const userAvaxBalance = currentUser.balance;
    const userEncryptedMnemonics = currentUser.encrypted_mnemonics;

    const mnemonics = decrypt(userEncryptedMnemonics);

    if (amountToBuy === "buy_custom") {
      console.log("aaaaaaahahhhhh");
      state[user] = {
        state: "awaiting_custom_amount",
        trade: {
          userAddress: userAddress,
          contractAddress: response.attributes.address,
          encrypted_mnemonics: userEncryptedMnemonics,
          decimals: response.attributes.decimals,
          ticker: response.attributes.symbol,
          coinName: response.attributes.name
        }
      };
      console.log("user value is different");
      console.log("User wants a custom value for buy");
      // awaitingCustomValue = true;
      await ctx.reply("Enter the custom value for buy: 👀 example 0.23 👇");
      // const customValue = await getUserInput(ctx);

      usersAwaitingAmount.push(user);
      console.log(usersAwaitingAmount[user]);

      return;
    }
    const preTokenInfo = await fetchSpecificTokenBalance(
      userAddress,
      response.attributes.address
    );
    const preTokenBalance = fromCustomLamport(
      preTokenInfo[0]?.balance || 0,
      preTokenInfo[0]?.decimals || 18
    );

    try {
      await ctx.reply("processing tx ⚡️ ==========");
      await ctx.reply("processing gas ⛽️ ==========");
      const result = await useContract(
        userAddress,
        response.data.data.attributes.address,
        mnemonics,
        response.data.data.attributes.decimals,
        response.data.data.attributes.symbol,
        response.data.data.attributes.name,
        amountToBuy
      );
      await ctx.replyWithHTML(
        `<b>cheers 🪄🎉 here's your transaction hash:</b>\n<a href="https://snowtrace.io/tx/${result.hash}"> view on explorer  ${result.hash} </a>`
      );
      await ctx.replyWithHTML(
        `<b> fetching your portfolio details ♻️ ===== </b>`
      );
      await delay(4000);

      const postTokenInfo = await fetchSpecificTokenBalance(
        userAddress,
        response.attributes.address
      );
      console.log("postTOkenInfo");
      console.log(postTokenInfo);
      const postTokenBalance = fromCustomLamport(
        postTokenInfo[0].balance,
        postTokenInfo[0].decimals
      );
      console.log("postTokenBalance");
      console.log(postTokenBalance);

      const difference = postTokenBalance - preTokenBalance;
      console.log("======= difference in balance =========");
      console.log(difference);

      const specificTokenPrice = await WavaxPoolTokenPrice(
        response.attributes.address
      );
      const specificTokenPriceUSD = await tokenPrice(
        response.attributes.address
      );
      const purchasedValueWAVAX = difference * specificTokenPrice;
      const purchasedValueUSD = difference * specificTokenPriceUSD;

      await pointReward(
        user,
        response.attributes.address,
        "buy",
        difference,
        purchasedValueWAVAX,
        purchasedValueUSD
      );

      await portfolioBuyDialog(ctx, user, response.attributes.address);
      return;
    } catch (error) {
      await txError(error, ctx);
    }
  } catch (error) {
    console.log("error occured in buy ============");
    console.log(error);
  }
});

// sell options

bot.action(["50p", "100p", "sell_custom"], async (ctx) => {
  try {
    let username = ctx.chat?.username;
    if (!username && ctx.from && ctx.from.id) {
      username = ctx.from.id.toString();
    }
    console.log(ctx.match[0]);
    // ctx.answerCbQuery("hello");
    console.log("nigga pressed it for sell");
    // const amountToBuy = "5";
    const amountToBuy = ctx.match[0].toString();

    let user = ctx.chat?.username;
    if (!user && ctx.from && ctx.from.id) {
      user = ctx.from.id.toString();
    }
    let awaitingCustomValue = false;

    const currentUser = await createUser(user);
    const userAddress = currentUser.address;
    const userAvaxBalance = currentUser.balance;
    const userEncryptedMnemonics = currentUser.encrypted_mnemonics;

    const mnemonics = decrypt(userEncryptedMnemonics);
    let response = sellAddress[user];

    if (amountToBuy === "sell_custom") {
      sellState[username] = {
        state: "awaiting_custom_sell",
        trade: {
          userAddress: userAddress,
          contractAddress: response.attributes.address,
          encrypted_mnemonics: userEncryptedMnemonics,
          decimals: response.attributes.decimals,
          ticker: response.attributes.symbol,
          coinName: response.attributes.name
        }
      };
      console.log("user value is different");
      console.log("User wants a custom value for sell");
      awaitingCustomValue = true;
      await ctx.reply("Enter the custom value to sell: 👀 example 0.3 👇");
      // const customValue = await getUserInput(ctx);

      usersAwaitingSell.push(username);
      console.log(usersAwaitingSell[username]);

      return;
    }

    let validAmount = amountToBuy.replace("p", "");
    validAmount = validAmount == "100" && "99";
    console.log("valid amount ", validAmount);

    // const tokenPricee = await tokenPrice(response.attributes.address);
    // const tokenInfo = await fetchSpecificTokenBalance(
    //   userAddress,
    //   response.attributes.address
    // );
    // const tokenBalance = tokenInfo[0].balance;
    // const tokenDecimal = tokenInfo[0].decimals;

    // const formattedTokenValue = fromCustomLamport(
    //   tokenBalance,
    //   tokenDecimal
    // ).toFixed(3);

    // const preTokenValueInUsd = Number(tokenPricee) * formattedTokenValue;

    try {
      await ctx.reply("processing tx ⚡️ ==========");
      await ctx.reply("processing gas ⛽️ ==========");
      const result = await sellContract(
        userAddress,
        response.attributes.address,
        mnemonics,
        response.attributes.decimals,
        response.attributes.symbol,
        response.attributes.name,
        validAmount,
        "",
        true,
        ctx,
        username
      );

      await ctx.replyWithHTML(
        `<b>cheers 🪄🎉 here's your transaction hash:</b>\n<a href="https://snowtrace.io/tx/${result.hash}"> view on explorer ${result.hash}  </a>`,
        fastKeyboard
      );

      // const tokenInfoAfterTx = await fetchSpecificTokenBalance(
      //   userAddress,
      //   response.attributes.address
      // );

      // const tokenBalanceAfterTx = tokenInfoAfterTx[0].balance;
      // const tokenDecimalAfterTx = tokenInfoAfterTx[0].decimals;

      // const formattedTokenValue = fromCustomLamport(
      //   tokenBalanceAfterTx,
      //   tokenDecimalAfterTx
      // ).toFixed(3);

      // const postTokenValueInUsd = Number(tokenPrice) * formattedTokenValue;

      // const differenceInValue = preTokenValueInUsd - postTokenValueInUsd;
      // console.log("differenceInValue ======");
      // console.log(differenceInValue);

      // await pointReward(
      //   username,
      //   response.attributes.address,
      //   "sell",
      //   validAmount,
      //   "",
      //   differenceInValue
      // );

      return;
    } catch (error) {
      await txError(error, ctx);
    }

    const customValue = ctx?.message?.text;
    usersAwaitingSell.includes(currentUser) &&
      (await customSellForSpecificUser(currentUser, customValue, ctx));
  } catch (error) {
    console.log(" error from custom sell ============");
    console.log(error);
  }
});

// handle pair query for buy prompt
bot.on("text", async (ctx) => {
  try {
    // let continueListening = true;

    // if (continueListening){
    let username = ctx.chat?.username;
    if (!username && ctx.from && ctx.from.id) {
      username = ctx.from.id.toString();
    }
    let userInput = ctx.message.text;

    console.log("userInput");
    console.log(userInput);
    isWalletValid(userInput) &&
      (await axios
        .get(
          `https://api.geckoterminal.com/api/v2/networks/avax/tokens/${userInput}`
        )
        .then(async (response) => {
          console.log(response.data);

          const message = `
<b>🥂✨ ${response.data.data.attributes.name} ($${
            response.data.data.attributes.symbol
          }) 📈✨🥂</b>\n<code>${
            response.data.data.attributes.address
          }</code>\n\n
<a href='https://traderjoexyz.com/avalanche/pool/v1/${
            response.data.data.attributes.address
          }/AVAX'>TraderJoe</a> | <a href="https://snowtrace.io/address/${
            response.data.data.attributes.address
          }">Snowtrace</a>\n
<b>General</b>
<pre><code>🔺 Price         | $${response.data.data.attributes.price_usd}
</code>\n<code>📊 Market Cap    | $${formatNumber(
            response.data.data.attributes.market_cap_usd ||
              +response.data.data.attributes.price_usd *
                +response.data.data.attributes.total_supply
          )}</code>\n<code>
📈 FDV           | $${formatNumber(response.data.data.attributes.fdv_usd)}
</code>\n<code>🗄 Total Supply  | ${formatNumber(
            response.data.data.attributes.total_supply
          )} ${response.data.data.attributes.symbol}</code>
</pre>
`;

          const buyOptions = Markup.inlineKeyboard([
            [
              Markup.button.callback("⚡️ Buy 0.5 ", "0.5"),
              Markup.button.callback("⚡️ Buy 5 ", "5"),
              Markup.button.callback("⚡️ Buy X", "buy_custom")
            ],
            [
              Markup.button.callback("⏪ Buy Menu ", "button1"),
              Markup.button.callback("⏮ Main Menu ", "mainMenu")
            ],
            [
              Markup.button.url(
                "📊 Chart ",
                `https://dexscreener.com/avalanche/${userInput}`
              ),
              Markup.button.callback("❌ Close ", "vanish")
            ]
          ]);

          await ctx.replyWithHTML(message);
          await ctx.reply(`🎉 we found it ✨`, buyOptions);

          let awaitingCustomValue = false;
          let customValue = null;
          userInput = "";

          buyAddress[username] = response.data.data;

          // Further processing with the custom value...

          // await ctx.replyWithMarkdownV2(buyOptions);
        })
        .catch(async (error) => {
          const buyOptions = Markup.inlineKeyboard([
            [
              Markup.button.callback("⏪ Buy Menu ", "button1"),
              Markup.button.callback("⏮ Main Menu ", "mainMenu")
            ],
            [
              Markup.button.url(
                "📊 Chart ",
                `https://dexscreener.com/avalanche/${userInput}`
              ),
              Markup.button.callback("❌ Close ", "vanish")
            ]
          ]);
          await ctx.reply(
            `😵‍💫 that looks like a valid address, but we couldn't find any tokens ✨`,
            buyOptions
          );
        }));

    // }

    // let currentUser = ctx.chat.username;
    let currentUser = ctx.chat?.username;
    if (!currentUser && ctx.from && ctx.from.id) {
      currentUser = ctx.from.id.toString();
    }

    const customValue = ctx.message.text;

    usersAwaitingAmount.includes(currentUser)
      ? await customBuyForSpecificUser(currentUser, customValue, ctx)
      : usersAwaitingSell.includes(currentUser) &&
        (await customSellForSpecificUser(currentUser, customValue, ctx));
  } catch (error) {
    console.log(error);
  }
});

// callback query for sell prompt
bot.on("callback_query", async (ctx) => {
  try {
    // let continueListening = true;

    // if (continueListening){

    let username = ctx.chat?.username;
    if (!username && ctx.from && ctx.from.id) {
      username = ctx.from.id.toString();
    }
    let userInput = ctx.callbackQuery.data;

    console.log("userInputhere");
    console.log(userInput);
    isWalletValid(userInput) &&
      (await axios
        .get(
          `https://api.geckoterminal.com/api/v2/networks/avax/tokens/${userInput}`
        )
        .then(async (response) => {
          console.log(response.data);

          const message = `
<b>🥂✨ ${response.data.data.attributes.name} ($${
            response.data.data.attributes.symbol
          }) 📈✨🥂</b>\n<code>${
            response.data.data.attributes.address
          }</code>\n\n
<a href='https://traderjoexyz.com/avalanche/pool/v1/${
            response.data.data.attributes.address
          }/AVAX'>TraderJoe</a> | <a href="https://snowtrace.io/address/${
            response.data.data.attributes.address
          }">Snowtrace</a>\n
<b>General</b>
<pre><code>🔺 Price         | $${response.data.data.attributes.price_usd}
</code>\n<code>📊 Market Cap    | $${formatNumber(
            response.data.data.attributes.market_cap_usd ||
              +response.data.data.attributes.price_usd *
                +response.data.data.attributes.total_supply
          )}</code>\n<code>
📈 FDV           | $${formatNumber(response.data.data.attributes.fdv_usd)}
</code>\n<code>🗄 Total Supply  | ${formatNumber(
            response.data.data.attributes.total_supply
          )} ${response.data.data.attributes.symbol}</code>
</pre>
`;

          const sellOptions = Markup.inlineKeyboard([
            [
              Markup.button.callback("⚡️ Sell 50% ", "50p"),
              Markup.button.callback("⚡️ Sell 100% ", "100p"),
              Markup.button.callback("⚡️ Sell X", "sell_custom")
            ],
            [
              Markup.button.callback("⏪ Open Positions ", "sell"),
              Markup.button.callback("⏮ Main Menu ", "mainMenu")
            ],
            [
              Markup.button.url(
                "📊 Chart ",
                `https://dexscreener.com/avalanche/${userInput}`
              ),
              Markup.button.callback("❌ Close ", "vanish")
            ]
          ]);

          await ctx.replyWithHTML(message);
          await ctx.reply(`🎉 we found it ✨`, sellOptions);

          let awaitingCustomValue = false;
          let customValue = null;
          userInput = "";

          sellAddress[username] = response.data.data;
          bot.action("sleep", async (ctx) => {
            console.log("sleep");
            ctx.answerCbQuery("hello");
          });

          // Further processing with the custom value...

          // await ctx.replyWithMarkdownV2(buyOptions);
        })
        .catch(async (error) => {
          const buyOptions = Markup.inlineKeyboard([
            [
              Markup.button.callback("⏪ Buy Menu ", "button1"),
              Markup.button.callback("⏮ Main Menu ", "mainMenu")
            ],
            [
              Markup.button.callback(
                "📊 Chart ",
                `https://dexscreener.com/avalanche/${userInput}`
              ),
              Markup.button.callback("❌ Close ", "vanish")
            ]
          ]);
          await ctx.reply(
            `😵‍💫 that looks like a valid address, but we couldn't find any tokens ✨`,
            buyOptions
          );
        }));

    // }
    return;
    // let currentUser = ctx.chat.username;

    // const customValue = ctx.message.text;

    // usersAwaitingSell.includes(currentUser) &&
    //   (await customSellForSpecificUser(currentUser, customValue, ctx));
  } catch (error) {
    console.log(error);
  }
});

const customSellForSpecificUser = async (username, customValue, ctx) => {
  console.log("heyy I got a custom value ", customValue);
  console.log("from ", username);
  const index = usersAwaitingSell.indexOf(username);
  sellState[username].trade.amount = customValue;

  usersAwaitingSell.splice(index, 1);
  console.log(usersAwaitingSell);
  console.log(sellState[username]);

  console.log("running custom sell ==========");

  await ctx.reply("========== processing tx ⚡️");
  await ctx.reply("========== processing gas ⛽️");

  try {
    const result = await sellContract(
      sellState[username].trade.userAddress,
      sellState[username].trade.contractAddress,
      decrypt(sellState[username].trade.encrypted_mnemonics),
      sellState[username].trade.decimals,
      sellState[username].trade.ticker,
      sellState[username].trade.coinName,
      sellState[username].trade.amount,
      sellState[username].trade.slippage,
      false,
      ctx
    );
    await ctx.replyWithHTML(
      `<b>cheers 🪄🎉 here's your transaction hash:</b>\n<a href="https://snowtrace.io/tx/${result.hash}"> view on explorer ${result.hash}  </a>`,
      fastKeyboard
    );
    return;
  } catch (error) {
    await txError(error, ctx);
  }

  sellState.hasOwnProperty(username) && delete sellState[username];
  console.log(sellState);
};

const customBuyForSpecificUser = async (username, customValue, ctx) => {
  console.log("heyy I got a custom value ", customValue);
  console.log("from ", username);
  const index = usersAwaitingAmount.indexOf(username);
  state[username].trade.amount = customValue;

  usersAwaitingAmount.splice(index, 1);
  console.log(usersAwaitingAmount);
  console.log(state[username]);

  console.log("running custom buy ============");

  await ctx.reply("processing tx ⚡️ ==========");
  await ctx.reply("processing gas ⛽️ ==========");
  const preTokenInfo = await fetchSpecificTokenBalance(
    state[username].trade.userAddress,
    state[username].trade.contractAddress
  );
  console.log("preTokenInfo");
  console.log(preTokenInfo);
  const preTokenBalance = fromCustomLamport(
    preTokenInfo[0]?.balance || 0,
    preTokenInfo[0]?.decimals || 18
  );
  console.log("preTokenBalance");
  console.log(preTokenBalance);

  try {
    const result = await useContract(
      state[username].trade.userAddress,
      state[username].trade.contractAddress,
      decrypt(state[username].trade.encrypted_mnemonics),
      state[username].trade.decimals,
      state[username].trade.ticker,
      state[username].trade.coinName,
      state[username].trade.amount,
      state[username].trade.slippage
    );
    await ctx.replyWithHTML(
      `<b>cheers 🪄🎉 here's your transaction hash:</b>\n<a href="https://snowtrace.io/tx/${result.hash}"> view on explorer ${result.hash}  </a>`
    );
    await ctx.replyWithHTML(
      `<b> fetching your portfolio details ♻️ ===== </b>`
    );
    await delay(4000);
    const postTokenInfo = await fetchSpecificTokenBalance(
      state[username].trade.userAddress,
      state[username].trade.contractAddress
    );
    console.log("=============== postTOkenInfo");
    console.log(postTokenInfo);
    const postTokenBalance = fromCustomLamport(
      postTokenInfo[0].balance,
      postTokenInfo[0].decimals
    );
    console.log("============= postTokenBalance");
    console.log(postTokenBalance);
    const difference = postTokenBalance - preTokenBalance;
    console.log("======= difference in balance =========");
    console.log(difference);

    const specificTokenPrice = await WavaxPoolTokenPrice(
      state[username].trade.contractAddress
    );
    console.log("specificTokenPrice");
    console.log(specificTokenPrice);
    const specificTokenPriceUSD = await tokenPrice(
      state[username].trade.contractAddress
    );
    console.log("================ specificTokenPriceUSD");
    console.log(specificTokenPriceUSD);
    const purchasedValueWAVAX = difference * specificTokenPrice;
    const purchasedValueUSD = difference * specificTokenPriceUSD;

    console.log("================ purchasedValueWAVAX");
    console.log(purchasedValueWAVAX);
    console.log("================ purchasedValueUSD");
    console.log(purchasedValueUSD);

    await pointReward(
      username,
      state[username].trade.contractAddress,
      "buy",
      difference,
      purchasedValueWAVAX,
      purchasedValueUSD
    );

    console.log("================== got to pointReward");

    await portfolioBuyDialog(
      ctx,
      username,
      state[username].trade.contractAddress
    );
    console.log("=================== got to portfolioBuyDialog");
    return;
  } catch (error) {
    await txError(error, ctx);
  }

  state.hasOwnProperty(username) && delete state[username];
  console.log(state);
};

// await resetTrades();

// Launch bot
bot.launch();

// Graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
