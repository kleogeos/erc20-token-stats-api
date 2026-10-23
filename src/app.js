const express = require("express");
const { TtlCache } = require("./cache");
const { isSupportedChain, isValidAddress, CHAINS } = require("./chains");
const { fetchPriceData } = require("./priceSource");
const { fetchHolderCount } = require("./holdersSource");

function createApp({ fetchImpl = fetch, cacheTtlMs = 60_000, etherscanApiKey = process.env.ETHERSCAN_API_KEY } = {}) {
  const app = express();
  const cache = new TtlCache(cacheTtlMs);
  app.cache = cache; // exposed for tests/introspection, not part of the public API contract

  app.get("/health", (req, res) => res.json({ ok: true, supported_chains: Object.keys(CHAINS) }));

  app.get("/token/:chain/:address", async (req, res) => {
    const { chain, address } = req.params;

    if (!isSupportedChain(chain)) {
      return res.status(400).json({ error: `unsupported chain '${chain}'`, supported_chains: Object.keys(CHAINS) });
    }
    if (!isValidAddress(address)) {
      return res.status(400).json({ error: "address must be a 0x-prefixed 40 hex-char ERC20 contract address" });
    }

    const key = `${chain}:${address.toLowerCase()}`;
    const cached = cache.get(key);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    let priceData;
    try {
      priceData = await fetchPriceData(chain, address, fetchImpl);
    } catch (err) {
      return res.status(502).json({ error: "upstream price lookup failed", detail: err.message });
    }

    if (!priceData) {
      return res.status(404).json({ error: "token not recognized by CoinGecko on this chain" });
    }

    const holderData = await fetchHolderCount(chain, address, etherscanApiKey, fetchImpl);

    const result = {
      chain,
      address: address.toLowerCase(),
      ...priceData,
      ...holderData,
      updated_at: new Date().toISOString(),
    };

    cache.set(key, result);
    res.json({ ...result, cached: false });
  });

  return app;
}

module.exports = { createApp };
