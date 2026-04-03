import { AgentRuntime, elizaLogger } from "@elizaos/core";
import type { Character } from "@elizaos/core";
import { polymarketPlugin, startScheduledScan } from "./plugins/polymarket/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const characterPath = path.join(__dirname, "..", "characters", "jarvis-pm.character.json");
const character = JSON.parse(fs.readFileSync(characterPath, "utf-8")) as Character;

elizaLogger.info("🚀 Starting JARVIS-PM — Prediction Market Intelligence Agent");
elizaLogger.info("🔗 Running on Nosana decentralized compute");

async function main(): Promise<void> {
  const runtime = new AgentRuntime({
    character,
    plugins: [polymarketPlugin],
  });

  await runtime.initialize();
  elizaLogger.success("✅ JARVIS-PM ready — scanning Polymarket for edges");

  // Start background market scanning every 30 minutes
  startScheduledScan(runtime);
  elizaLogger.info("📡 Background market scanning started (30-min interval)");

  process.on("SIGINT", () => {
    elizaLogger.info("Shutting down JARVIS-PM");
    process.exit(0);
  });
}

main().catch((err: unknown) => {
  elizaLogger.error("Fatal error:", String(err));
  process.exit(1);
});
