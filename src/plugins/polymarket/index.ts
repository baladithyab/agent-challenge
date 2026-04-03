import type {
  Plugin,
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  HandlerOptions,
  ActionResult,
  Content,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";

const GAMMA_API = "https://gamma-api.polymarket.com";

interface Market {
  question: string;
  slug: string;
  yesPrice: number;
  oneHourChange: number;
  volume24h: number;
}

interface PolymarketApiMarket {
  question?: string;
  slug?: string;
  outcomePrices?: string;
  oneHourPriceChange?: string;
  volume24hr?: string;
  acceptingOrders?: boolean;
}

async function fetchMarkets(limit = 100): Promise<Market[]> {
  const res = await fetch(
    `${GAMMA_API}/markets?active=true&closed=false&limit=${limit}&order=volume24hr&ascending=false`
  );
  const data = (await res.json()) as PolymarketApiMarket[];

  const SPORTS = ["nba", "nfl", "vs.", "o/u", "spread", "assists", "points", "rebounds"];

  return data
    .filter((m) => {
      const q = (m.question || "").toLowerCase();
      if (!m.acceptingOrders) return false;
      if (SPORTS.some((k) => q.includes(k))) return false;
      return true;
    })
    .map((m) => {
      const prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]') as string[];
      return {
        question: m.question || "",
        slug: m.slug || "",
        yesPrice: parseFloat(prices[0] || "0.5"),
        oneHourChange: parseFloat(m.oneHourPriceChange || "0"),
        volume24h: parseFloat(m.volume24hr || "0"),
      };
    })
    .filter((m) => m.yesPrice >= 0.03 && m.yesPrice <= 0.97);
}

// SCAN MARKETS action
const scanMarketsAction: Action = {
  name: "SCAN_MARKETS",
  description: "Scan Polymarket for mispriced prediction markets and generate trading signals",
  similes: [
    "scan markets",
    "find edges",
    "check polymarket",
    "trading signals",
    "what should i bet on",
    "market opportunities",
  ],

  validate: async (_runtime: IAgentRuntime, _message: Memory): Promise<boolean> => {
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    _options?: HandlerOptions,
    callback?: HandlerCallback
  ): Promise<ActionResult | void> => {
    await callback?.({ text: "📡 Scanning Polymarket for edges..." });

    const markets = await fetchMarkets(50);
    markets.sort((a, b) => b.volume24h - a.volume24h);
    const top = markets.slice(0, 10);

    const marketList = top
      .map(
        (m, i) =>
          `${i + 1}. "${m.question}" — YES @ ${m.yesPrice.toFixed(3)}, 1h: ${(m.oneHourChange * 100).toFixed(1)}%, vol24h: $${m.volume24h.toLocaleString()}`
      )
      .join("\n");

    const prompt = `You are JARVIS-PM, a prediction market analyst. Review these markets and identify edges.

Markets (sorted by volume):
${marketList}

For each market with a clear edge (your estimate differs from market price by >5%), output one line:
SIGNAL: [question] | [YES/NO] @ [price] | Est: [prob]% | Edge: [edge%] | [BUY/WATCH/SKIP]

Focus: geopolitics, elections, crypto, macro. Skip if high velocity (>2% 1h move = informed flow).
Output only SIGNAL lines. If no edges found, output: NO_EDGES`;

    const result = await runtime.generateText(prompt);
    const response = result.text;

    const signals = response
      .split("\n")
      .filter((l) => l.startsWith("SIGNAL:"))
      .map((l) => "🎯 " + l.replace("SIGNAL:", "").trim())
      .slice(0, 5);

    if (signals.length === 0) {
      await callback?.({
        text: "📊 Scanned top 10 markets — no actionable edges found. Markets appear fairly priced. Try 'research [topic]' for deep analysis.",
      });
    } else {
      await callback?.({
        text: `📡 **Polymarket Signal Scan**\n\n${signals.join("\n")}\n\n_Use 'research [market name]' for detailed analysis._`,
      });
    }
  },

  examples: [
    [
      { name: "user", content: { text: "scan markets" } },
      { name: "JARVIS-PM", content: { text: "📡 Scanning Polymarket for edges..." } },
    ],
  ],
};

// RESEARCH MARKET action
const researchMarketAction: Action = {
  name: "RESEARCH_MARKET",
  description: "Deep research and probability estimate for a specific prediction market",
  similes: [
    "research",
    "analyze",
    "investigate",
    "probability of",
    "chance of",
    "will it happen",
    "assess market",
  ],

  validate: async (_runtime: IAgentRuntime, _message: Memory): Promise<boolean> => {
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: HandlerOptions,
    callback?: HandlerCallback
  ): Promise<ActionResult | void> => {
    const msgContent = message.content as Content & { text?: string };
    const text = (msgContent.text || "").toLowerCase();

    const markets = await fetchMarkets(200);

    const stopWords = new Set([
      "research", "analyze", "check", "odds", "the", "a", "an",
      "probability", "of", "chance", "will", "happen", "what",
    ]);
    const keywords = text
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    const match = markets
      .sort((a, b) => b.volume24h - a.volume24h)
      .find((m) =>
        keywords.some((kw) => m.question.toLowerCase().includes(kw))
      );

    if (!match) {
      await callback?.({
        text: `❓ No market found. Try: 'research iran ceasefire' or 'research brazil world cup'`,
      });
      return;
    }

    await callback?.({
      text: `🔍 Researching: **${match.question}**\nYES @ ${match.yesPrice.toFixed(3)} | 1h: ${(match.oneHourChange * 100).toFixed(1)}% | Vol: $${match.volume24h.toLocaleString()}\n\nAnalyzing...`,
    });

    const velNote =
      Math.abs(match.oneHourChange) > 0.02
        ? "⚠️ HIGH VELOCITY — informed flow detected, consider skipping"
        : Math.abs(match.oneHourChange) > 0.005
        ? "⚡ Medium velocity"
        : "✅ Low velocity — potentially undiscovered edge";

    const prompt = `Analyze this prediction market and estimate the true probability:

**Market:** "${match.question}"
**Current price:** YES @ ${match.yesPrice.toFixed(3)} (${(match.yesPrice * 100).toFixed(1)}%)
**1h change:** ${(match.oneHourChange * 100).toFixed(2)}%
**Velocity:** ${velNote}
**Volume 24h:** $${match.volume24h.toLocaleString()}

Provide:
- **Estimated probability:** X% YES
- **Key factors:** 2-3 bullet points
- **Assessment:** overpriced / underpriced / fair  
- **Edge:** +X% or -X% vs market
- **Signal:** BUY YES / BUY NO / WATCH / SKIP
- **Confidence:** low / medium / high`;

    const result = await runtime.generateText(prompt);

    await callback?.({
      text: `📊 **Analysis: ${match.question}**\n\n${result.text}`,
    });
  },

  examples: [
    [
      { name: "user", content: { text: "research iran ceasefire" } },
      { name: "JARVIS-PM", content: { text: "🔍 Researching..." } },
    ],
  ],
};

// Scheduled background scan (every 30 min)
export function startScheduledScan(runtime: IAgentRuntime): NodeJS.Timeout {
  const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

  const runScan = async (): Promise<void> => {
    elizaLogger.info("🕐 [Scheduled] Running Polymarket background scan...");
    try {
      const markets = await fetchMarkets(50);
      const top = markets.sort((a, b) => b.volume24h - a.volume24h).slice(0, 10);

      const marketList = top
        .map((m, i) =>
          `${i + 1}. "${m.question}" — YES @ ${m.yesPrice.toFixed(3)}, 1h: ${(m.oneHourChange * 100).toFixed(1)}%, vol: $${m.volume24h.toLocaleString()}`
        )
        .join("\n");

      const prompt = `You are JARVIS-PM. Do a quick edge scan. For markets with >5% edge only, output:
SIGNAL: [question] | [YES/NO] @ [price] | Est: [prob]% | Edge: [edge%] | [BUY/WATCH/SKIP]
If none: NO_EDGES

Markets:
${marketList}`;

      const result = await runtime.generateText(prompt);
      const signals = result.text
        .split("\n")
        .filter((l) => l.startsWith("SIGNAL:"));

      if (signals.length > 0) {
        elizaLogger.info(`📡 [Scheduled Scan] Found ${signals.length} signal(s):`);
        signals.forEach((s) => elizaLogger.info(`  ${s}`));
      } else {
        elizaLogger.info("📊 [Scheduled Scan] No edges found this cycle.");
      }
    } catch (err) {
      elizaLogger.error("[Scheduled Scan] Error:", String(err));
    }
  };

  // Run immediately, then on interval
  void runScan();
  return setInterval(() => void runScan(), INTERVAL_MS);
}

export const polymarketPlugin: Plugin = {
  name: "plugin-polymarket",
  description: "Polymarket prediction market intelligence — live scanning, edge detection, AI probability estimates",
  actions: [scanMarketsAction, researchMarketAction],
  providers: [],
  evaluators: [],
};

export default polymarketPlugin;
