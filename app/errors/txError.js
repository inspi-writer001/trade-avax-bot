export const txError = async (error, ctx) => {
  if (error.toString().includes("insufficient funds")) {
    console.log(error);
    await ctx.reply(
      " ❌❌❌ something went wrong while making your transaction 😵‍💫, please make sure you have enough and extra to cover for gas fees ⛽️ and try again 🚀"
    );
  } else if (error.toString().includes("gas")) {
    console.log(error);
    await ctx.reply(
      " ❌❌❌ something went wrong while making your transaction 😵‍💫, please make sure you have enough and extra to cover for gas fees ⛽️ and try again 🚀"
    );
  } else if (error.toString().includes("reverted")) {
    console.log(error);
    await ctx.reply(
      " ❌❌❌ something went wrong while making your transaction 😵‍💫, please make sure you have enough and extra to cover for gas fees ⛽️ and try again 🚀"
    );
  } else {
    console.log(error);
    console.log("=========================");
    console.log(error.toString());
    await ctx.reply("it's not you, it's us 😵‍💫, please try again later 🚀");
  }
};
