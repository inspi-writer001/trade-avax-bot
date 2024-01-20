export class PoolData {
  constructor(data) {
    this.id = data.id;
    this.type = data.type;
    this.attributes = data.attributes;
    this.relationships = data.relationships;
  }

  get name() {
    return this.attributes.name;
  }

  get address() {
    return this.attributes.address;
  }

  get baseTokenPriceUSD() {
    return this.attributes.base_token_price_usd;
  }

  get quoteTokenPriceUSD() {
    return this.attributes.quote_token_price_usd;
  }

  get baseTokenPriceNativeCurrency() {
    return this.attributes.base_token_price_native_currency;
  }

  get quoteTokenPriceNativeCurrency() {
    return this.attributes.quote_token_price_native_currency;
  }

  get baseTokenPriceQuoteToken() {
    return this.attributes.base_token_price_quote_token;
  }

  get quoteTokenPriceBaseToken() {
    return this.attributes.quote_token_price_base_token;
  }

  get poolCreatedAt() {
    return this.attributes.pool_created_at;
  }

  get reserveInUSD() {
    return this.attributes.reserve_in_usd;
  }

  get fdvUSD() {
    return this.attributes.fdv_usd;
  }

  get marketCapUSD() {
    return this.attributes.market_cap_usd;
  }

  get priceChangePercentage() {
    return this.attributes.price_change_percentage;
  }

  get transactions() {
    return this.attributes.transactions;
  }

  get volumeUSD() {
    return this.attributes.volume_usd;
  }
}
