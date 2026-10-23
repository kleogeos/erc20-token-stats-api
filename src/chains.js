// Maps our short chain id to the CoinGecko "asset platform" id used in its token_price endpoint.
const CHAINS = {
  ethereum: "ethereum",
  bsc: "binance-smart-chain",
  polygon: "polygon-pos",
  arbitrum: "arbitrum-one",
};

function isSupportedChain(chain) {
  return Object.prototype.hasOwnProperty.call(CHAINS, chain);
}

function coingeckoPlatform(chain) {
  return CHAINS[chain];
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function isValidAddress(address) {
  return typeof address === "string" && ADDRESS_RE.test(address);
}

module.exports = { CHAINS, isSupportedChain, coingeckoPlatform, isValidAddress };
