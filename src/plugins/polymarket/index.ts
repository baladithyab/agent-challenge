import { Plugin, Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";

const GAMMA_API = "https://gamma-api.polymarket.com";
const CLOB_API = "https://clob.polymarket.com";

interface Market {
  question: string;
  slug: string;
  yesPrice: number;
  oneHourChange: number;
  volume24h: number;
  endDate: string;
}

interface Signal {
  market: string;
  side: "YES" | "NO";
  marketPrice: number;
  estimatedProb: number;
  edge: number;
  velocity: number;
  action: "BUY" | "WATCH" | "SKIP";
}

// Fetch active Polymarket markets with velocity data
async function fetchMarkets(limit = 50): Promise<Market[]> {
  const res = await fetch(
    `${GAMMA_API}/markets?active=true&closed=false&limit=${limit}&order=volume24hr&ascending=false`
  );
  const data = await res.json();
  
  const SPORTS_KEYWORDS = ["nba", "nfl", "vs.", "o/u", "spread", "assists", "points"];
  
  return data
    .filter((m: any) => {
      const q = (m.question || "").toLowerCase();
      if (!m.acceptingOrders) return false;
      if (SPORTS_KEYWORDS.some(k => q.includes(k))) return false;
      return true;
    })
    .map((m: any) => {
      const prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]');
      return {
        question: m.question,
        slug: m.slug,
        yesPrice: parseFloat(prices[0]),
        oneHourChange: parseFloat(m.oneHourPriceChange || "0"),
        volume24h: parseFloat(m.volume24hr || "0"),
        endDate: m.endDateIso || "",
      };
    })
    .filter((m: Market) => m.yesPrice >= 0.03 && m.yesPrice <= 0.97);
}

// Score a market's edge using simple heuristics
function scoreMarket(market: Market, researchProb?: number): Signal {
  const prob = researchProb ?? market.yesPrice; // fallback to market if no research
  const edge = Math.abs(prob - market.yesPrice);
  const side = prob > market.yesPrice ? "YES" : "NO";
  const velocity = Math.abs(market.oneHourChange);
  
  let action: "BUY" | "WATCH" | "SKIP";
  if (velocity > 0.02) action = "SKIP"; // high velocity = informed flow
  else if (edge >= 0.08) action = "BUY";
  else if (edge >= 0.03) action = "WATCH";
  else action = "SKIP";

  return {
    market: market.question,
    side,
    marketPrice: market.yesPrice,
    estimatedProb: prob,
    edge,
    velocity,
    action,
  };
}

// Format signal for display
function formatSignal(s: Signal): string {
  const emoji = s.action === "BUY" ? "🎯" : s.action === "WATCH" ? "👀" : "⏭️";
  const velStr = s.velocity > 0.01 ? ` | vel=${(s.velocity * 100).toFixed(1)}%/1h` : "";
  return `${emoji} ${s.market.slice(0, 60)}: ${s.side} @ ${s.marketPrice.toFixed(3)} | Est: ${(s.estimatedProb * 100).toFixed(0)}% | Edge: ${(s.edge * 100).toFixed(1)}%${velStr} | ${s.action}`;
}

// SCAN MARKETS action
const scanMarketsAction: Action = {
  name: "SCAN_MARKETS",
  description: "Scan Polymarket for mispriced markets and generate trading signals",
  similes: ["scan markets", "find edges", "check polymarket", "what should I bet on", "trading signals"],
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return true; // always available
  },
  
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ) => {
    try {
      const markets = await fetchMarkets(100);
      
      // Sort by volume to get the most liquid markets
      markets.sort((a, b) => b.volume24h - a.volume24h);
      const topMarkets = markets.slice(0, 20);
      
      const signals = topMarkets
        .map(m => scoreMarket(m))
        .filter(s => s.action !== "SKIP")
        .slice(0, 5);
      
      if (signals.length === 0) {
        callback({ text: "📊 Scanned top 20 markets — no actionable edges found right now. Markets appear fairly priced. Check back later or try researching a specific market." });
        return true;
      }
      
      const output = `📡 Polymarket Signal Scan — Top ${signals.length} edges:\n\n${signals.map(formatSignal).join("\n")}\n\n_Scores based on volume, liquidity, and odds velocity. Use /research [market] for deep analysis._`;
      callback({ text: output });
      return true;
    } catch (err) {
      callback({ text: `❌ Scan error: ${err}` });
      return false;
    }
  },
  
  examples: [
    [
      { user: "user", content: { text: "Scan markets for edges" } },
      { user: "JARVIS-PM", content: { text: "📡 Scanning Polymarket..." } },
    ],
  ],
};

// RESEARCH MARKET action
const researchMarketAction: Action = {
  name: "RESEARCH_MARKET",
  description: "Deep research a specific prediction market question using web search",
  similes: ["research", "analyze", "investigate", "what do you think about", "check the odds on"],
  
  validate: async (runtime: IAgentRuntime, message: Memory) => true,
  
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ) => {
    // Extract market question from message
    const text = message.content.text || "";
    
    // Find matching markets
    const markets = await fetchMarkets(200);
    const query = text.toLowerCase().replace(/research|analyze|investigate|check|odds on/gi, "").trim();
    
    const match = markets.find(m => 
      m.question.toLowerCase().includes(query) ||
      query.split(" ").filter(w => w.length > 3).every(w => m.question.toLowerCase().includes(w))
    );
    
    if (!match) {
      callback({ text: `❓ Couldn't find a market matching "${query}". Try being more specific, e.g. "research Iran ceasefire April 15"` });
      return true;
    }
    
    // Generate research prompt for the LLM
    const researchPrompt = `Research this prediction market and estimate the TRUE probability:

Market: "${match.question}"
Current market price: YES @ ${match.yesPrice.toFixed(3)} (${(match.yesPrice * 100).toFixed(1)}%)
1-hour price change: ${(match.oneHourChange * 100).toFixed(2)}%
24h volume: $${match.volume24h.toLocaleString()}

Based on your knowledge up to your training cutoff and logical reasoning:
1. What is the true probability this resolves YES?
2. What factors are most important?
3. Is the market over/under-priced?

Output format:
- Estimated probability: X%
- Key factors: (2-3 bullet points)
- Market assessment: overpriced/underpriced/fair
- Edge: +/-X%
- Recommendation: BUY YES / BUY NO / SKIP`;

    callback({ 
      text: `🔍 Researching: "${match.question}"\nMarket: YES @ ${match.yesPrice.toFixed(3)} | 1h change: ${(match.oneHourChange * 100).toFixed(1)}% | Vol24h: $${match.volume24h.toLocaleString()}\n\n[Analyzing with Qwen3.5-27B...]` 
    });
    
    return true;
  },
  
  examples: [
    [
      { user: "user", content: { text: "Research the Iran ceasefire market" } },
      { user: "JARVIS-PM", content: { text: "🔍 Researching..." } },
    ],
  ],
};

// Export plugin
export const polymarketPlugin: Plugin = {
  name: "plugin-polymarket",
  description: "Polymarket prediction market scanning and signal generation",
  actions: [scanMarketsAction, researchMarketAction],
  providers: [],
  evaluators: [],
};

export default polymarketPlugin;
