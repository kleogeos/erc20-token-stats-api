const { coingeckoPlatform } = require("./chains");

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

// fetchImpl is injected (defaults to global fetch) so tests can stub the network call.
async function fetchPriceData(chain, address, fetchImpl = fetch) {
  const platform = coingeckoPlatform(chain);
  const url =
    `${COINGECKO_BASE}/simple/token_price/${platform}` +
    `?contract_addresses=${address}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true`;

  const res = await fetchImpl(url);
  if (!res.ok) {
    const err = new Error(`CoinGecko responded with ${res.status}`);
    err.upstreamStatus = res.status;
    throw err;
  }

  const body = await res.json();
  const entry = body[address.toLowerCase()];
  if (!entry || typeof entry.usd !== "number") {
    return null; // token not recognized by CoinGecko on this platform
  }

  return {
    price_usd: entry.usd,
    market_cap_usd: entry.usd_market_cap ?? null,
    volume_24h_usd: entry.usd_24h_vol ?? null,
  };
}

module.exports = { fetchPriceData };
