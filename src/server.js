const { createApp } = require("./app");

const PORT = process.env.PORT || 3000;
const app = createApp({});

app.listen(PORT, () => {
  console.log(`erc20-token-stats-api listening on :${PORT}`);
});
