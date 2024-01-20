export const extractReferralCodeFromURL = (url) => {
  const urlParts = url.split("?");
  if (urlParts.length > 1) {
    const queryParams = urlParts[1].split("&");
    for (const param of queryParams) {
      const [key, value] = param.split("=");
      if (key === "start") {
        return value;
      }
    }
  }
  return null;
};
