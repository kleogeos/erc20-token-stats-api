const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");

const VALID_ADDRESS = "0x" + "a1".repeat(20); // well-formed 40-hex-char placeholder address

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

async function get(server, path) {
  const port = server.address().port;
  const res = await fetch(`http://127.0.0.1:${port}${path}`);
  const body = await res.json();
  return { status: res.status, body };
}

function fakeFetch({ coingeckoBody = {}, coingeckoOk = true, coingeckoStatus = 200 } = {}) {
  let calls = 0;
  const impl = async (url) => {
    calls++;
    if (url.includes("coingecko.com")) {
      return {
        ok: coingeckoOk,
        status: coingeckoStatus,
        json: async () => coingeckoBody,
      };
    }
    if (url.includes("etherscan.io")) {
      return { ok: true, status: 200, json: async () => ({ status: "0", message: "NOTOK", result: "Missing Or invalid Module name" }) };
    }
    throw new Error(`unexpected fetch url: ${url}`);
  };
  impl.callCount = () => calls;
  return impl;
}

test("returns price data for a known token and caches the second lookup", async () => {
  const fetchImpl = fakeFetch({
    coingeckoBody: {
      [VALID_ADDRESS.toLowerCase()]: { usd: 1.0007, usd_market_cap: 5_000_000_000, usd_24h_vol: 120_000_000 },
    },
  });
  const app = createApp({ fetchImpl, cacheTtlMs: 60_000 });
  const server = await listen(app);
  try {
    const first = await get(server, `/token/ethereum/${VALID_ADDRESS}`);
    assert.equal(first.status, 200);
    assert.equal(first.body.price_usd, 1.0007);
    assert.equal(first.body.volume_24h_usd, 120_000_000);
    assert.equal(first.body.cached, false);
    assert.equal(first.body.holders, null); // no etherscan key configured in this test

    const second = await get(server, `/token/ethereum/${VALID_ADDRESS}`);
    assert.equal(second.status, 200);
    assert.equal(second.body.cached, true);
    assert.equal(second.body.price_usd, 1.0007);

    // price lookup (+ holders lookup, which short-circuits without hitting etherscan) should
    // only happen once - the second request must be served entirely from cache.
    assert.equal(fetchImpl.callCount(), 1);
  } finally {
    server.close();
  }
});

test("rejects an unsupported chain", async () => {
  const app = createApp({ fetchImpl: fakeFetch() });
  const server = await listen(app);
  try {
    const res = await get(server, `/token/solana/${VALID_ADDRESS}`);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /unsupported chain/);
  } finally {
    server.close();
  }
});

test("rejects a malformed contract address", async () => {
  const app = createApp({ fetchImpl: fakeFetch() });
  const server = await listen(app);
  try {
    const res = await get(server, "/token/ethereum/not-an-address");
    assert.equal(res.status, 400);
    assert.match(res.body.error, /0x-prefixed/);
  } finally {
    server.close();
  }
});

test("returns 404 when CoinGecko does not recognize the token", async () => {
  const app = createApp({ fetchImpl: fakeFetch({ coingeckoBody: {} }) });
  const server = await listen(app);
  try {
    const res = await get(server, `/token/ethereum/${VALID_ADDRESS}`);
    assert.equal(res.status, 404);
  } finally {
    server.close();
  }
});

test("returns 502 when the upstream price source errors", async () => {
  const app = createApp({ fetchImpl: fakeFetch({ coingeckoOk: false, coingeckoStatus: 500 }) });
  const server = await listen(app);
  try {
    const res = await get(server, `/token/ethereum/${VALID_ADDRESS}`);
    assert.equal(res.status, 502);
  } finally {
    server.close();
  }
});

test("/health reports supported chains", async () => {
  const app = createApp({ fetchImpl: fakeFetch() });
  const server = await listen(app);
  try {
    const res = await get(server, "/health");
    assert.equal(res.status, 200);
    assert.ok(res.body.supported_chains.includes("ethereum"));
  } finally {
    server.close();
  }
});
