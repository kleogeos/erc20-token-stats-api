// Holder count is not available from CoinGecko's free API and Etherscan only exposes
// `tokenholdercount` on its paid "Pro" tier. This module isolates that dependency so the
// rest of the API stays functional (holders: null) when no key is configured, and swaps in
// cleanly once a client provides a Pro key or we wire up an alternative indexer (Covalent,
// Moralis, etc.) for their specific chain.
const ETHERSCAN_BASE = "https://api.etherscan.io/api";

async function fetchHolderCount(chain, address, apiKey, fetchImpl = fetch) {
  if (!apiKey || chain !== "ethereum") {
    return { holders: null, holders_note: "holder count requires an Etherscan Pro API key (ethereum only in this build)" };
  }

  const url = `${ETHERSCAN_BASE}?module=token&action=tokenholdercount&contractaddress=${address}&apikey=${apiKey}`;
  const res = await fetchImpl(url);
  if (!res.ok) {
    return { holders: null, holders_note: `Etherscan responded with ${res.status}` };
  }

  const body = await res.json();
  if (body.status !== "1" || !body.result) {
    return { holders: null, holders_note: body.message || "Etherscan did not return a holder count (likely requires Pro tier)" };
  }

  return { holders: Number(body.result), holders_note: null };
}

module.exports = { fetchHolderCount };
