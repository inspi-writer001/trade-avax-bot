import axios from "axios";

export const oldAvaxPrice = async (balance) => {
  const response = await axios.get(
    "https://rest.coinapi.io/v1/exchangerate/AVAX/USD?apikey=F047E779-E4DB-4A2F-B904-CE676D31A956"
  );

  const value = response.data.rate.toFixed(3);
  const userBAlance = Number(+balance * value).toFixed(3);
  return userBAlance;
};

export const tokenPrice = async (contractAddress) => {
  const response = await axios.get(
    `https://api.geckoterminal.com/api/v2/networks/avax/tokens/${contractAddress}`
  );

  const usdPrice = response.data.data.attributes.price_usd;

  return Number(usdPrice);
};

export const AvaxPrice = async (balance) => {
  if (Number(balance) <= 0) return 0;
  const response = await axios.get(
    `https://pro-api.coinmarketcap.com/v2/tools/price-conversion?symbol=AVAX&amount=${balance}`,
    {
      headers: {
        "X-CMC_PRO_API_KEY": process.env.COINMARKET_API_KEY
      }
    }
  );

  const userBalance = response.data.data[0].quote.USD.price.toFixed(3);
  return userBalance;
};
