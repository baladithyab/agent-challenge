import { AgentRuntime, elizaLogger } from "@elizaos/core";
import { polymarketPlugin } from "./plugins/polymarket/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const characterPath = path.join(__dirname, "..", "characters", "jarvis-pm.character.json");
const character = JSON.parse(fs.readFileSync(characterPath, "utf-8"));

elizaLogger.info("🚀 Starting JARVIS-PM — Prediction Market Intelligence Agent");
elizaLogger.info("🔗 Running on Nosana decentralized compute");

async function main() {
  const runtime = new AgentRuntime({
    character,
    plugins: [polymarketPlugin],
  });
  
  await runtime.initialize();
  elizaLogger.success("✅ JARVIS-PM ready — scanning Polymarket for edges");
  
  // Start background market scanning
  // startScheduledScan(runtime) -- TODO: re-add after types fixed;
  
  process.on("SIGINT", () => {
    elizaLogger.info("Shutting down JARVIS-PM");
    process.exit(0);
  });
}

main().catch((err) => {
  elizaLogger.error("Fatal error:", err);
  process.exit(1);
});
