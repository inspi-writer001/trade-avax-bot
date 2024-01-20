import axios from "axios";

export const AvaxPrice = async (balance) => {
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
