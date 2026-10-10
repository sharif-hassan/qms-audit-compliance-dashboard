const app = require("./app");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set. Add it to qms-server/.env (see .env-example).");
  process.exit(1);
}

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
