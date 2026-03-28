import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createApp } from "./app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const port = Number(process.env.PORT || 4000);

async function start() {
  const app = createApp();

  // ✅ ADD THIS ROOT ROUTE (FIX)
  app.get("/", (req, res) => {
    res.send("Backend is running 🚀");
  });

  app.listen(port, () => {
    console.log(`Backend API listening on port ${port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start backend:", err);
  process.exit(1);
});