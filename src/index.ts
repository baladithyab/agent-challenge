import { AgentRuntime, settings, stringToUuid, elizaLogger } from "@elizaos/core";
import { polymarketPlugin } from "./plugins/polymarket/index.js";
import fs from "fs";
import path from "path";

// Load character
const characterPath = path.join(process.cwd(), "characters", "jarvis-pm.character.json");
const character = JSON.parse(fs.readFileSync(characterPath, "utf-8"));

// Add our custom plugin
character.plugins = [...(character.plugins || []), "plugin-polymarket"];

elizaLogger.info("Starting JARVIS-PM — Prediction Market Intelligence Agent");
elizaLogger.info("Running on Nosana decentralized compute");

async function main() {
  const runtime = new AgentRuntime({
    character,
    plugins: [polymarketPlugin],
  });
  
  await runtime.initialize();
  elizaLogger.success("JARVIS-PM agent ready");
  
  // Keep alive
  process.on("SIGINT", () => {
    elizaLogger.info("Shutting down JARVIS-PM");
    process.exit(0);
  });
}

main().catch(elizaLogger.error);
