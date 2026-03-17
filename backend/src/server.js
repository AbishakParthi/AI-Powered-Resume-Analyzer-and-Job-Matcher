import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createApp } from "./app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prefer backend/.env for backend runtime config, then allow root .env as fallback.
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const port = Number(process.env.PORT || 4000);

async function start() {
  const app = createApp();

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend API listening on port ${port}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start backend:", err);
  process.exit(1);
});
