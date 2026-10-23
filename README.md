# erc20-token-stats-api

REST API that returns **price, market cap and 24h trading volume** for any
ERC20 token given its contract address, with an in-memory TTL cache so
repeated lookups for the same token don't hit the upstream price source's
rate limits.

Built as a direct, scoped response to a real client request for a token
price/holders/volume API with caching.

## Run

```
npm install
npm start
```

Server listens on `:3000` (override with `PORT`).

## Endpoints

| Method | Path                       | Response |
|--------|----------------------------|----------|
| GET    | `/health`                  | `200` `{ ok, supported_chains }` |
| GET    | `/token/:chain/:address`   | `200` token stats, `400` bad chain/address, `404` token not recognized, `502` upstream failure |

Supported `:chain` values: `ethereum`, `bsc`, `polygon`, `arbitrum`.
`:address` must be a `0x`-prefixed 40-hex-char contract address.

Example response:

```json
{
  "chain": "ethereum",
  "address": "0x6b175474e89094c44da98b954eedeac495271d0f",
  "price_usd": 1.0,
  "market_cap_usd": 4540735227.97,
  "volume_24h_usd": 123810114.06,
  "holders": null,
  "holders_note": "holder count requires an Etherscan Pro API key (ethereum only in this build)",
  "updated_at": "2026-10-23T23:29:38.543Z",
  "cached": false
}
```

Price/market cap/volume come from CoinGecko's free public API - no key
needed. Repeated requests for the same `chain:address` within the cache TTL
(default 60s, configurable via `createApp({ cacheTtlMs })`) are served from
memory instead of calling CoinGecko again, so a dashboard polling every few
seconds won't get rate-limited.

## Holder count (scoped, not included by default)

Etherscan only exposes `tokenholdercount` on its **paid Pro tier** - it's not
available from the free API tier or from CoinGecko. This API is architected
so holder count is a pluggable `holdersSource` (`src/holdersSource.js`):
set `ETHERSCAN_API_KEY` (Pro key, Ethereum only in this build) and it will
populate `holders`; otherwise the field is `null` with a `holders_note`
explaining why. Swapping in a different indexer (Covalent, Moralis, a
chain's own explorer API) for other chains is a small, contained change in
that one file - deliberately scoped out of the initial build rather than
left broken or faked.

## Test

```
npm test
```

6 tests (Node's built-in test runner, no extra dependencies): success +
caching behavior, invalid chain, invalid address, token-not-found, upstream
failure, and the health check. The price source is stubbed via dependency
injection (`fetchImpl`) so tests don't depend on network access - verified
separately against the live CoinGecko API during development (DAI contract,
real price/market cap/volume returned correctly).
