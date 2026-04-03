import { 
  Plugin, Action, IAgentRuntime, Memory, State, HandlerCallback,
  generateText, ModelClass, composeContext
} from "@elizaos/core";

const GAMMA_API = "https://gamma-api.polymarket.com";

interface Market {
  question: string;
  slug: string;
  yesPrice: number;
  oneHourChange: number;
  volume24h: number;
  endDate: string;
}

async function fetchMarkets(limit = 100): Promise<Market[]> {
  const res = await fetch(
    `${GAMMA_API}/markets?active=true&closed=false&limit=${limit}&order=volume24hr&ascending=false`
  );
  const data = await res.json() as any[];
  
  const SPORTS = ["nba", "nfl", "vs.", "o/u", "spread", "assists", "points", "rebounds", "hockey", "soccer"];
  
  return data
    .filter((m: any) => {
      const q = (m.question || "").toLowerCase();
      if (!m.acceptingOrders) return false;
      if (SPORTS.some(k => q.includes(k))) return false;
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

function formatSignalLine(m: Market, prob: number): string {
  const edge = prob - m.yesPrice;
  const side = edge > 0 ? "YES" : "NO";
  const absEdge = Math.abs(edge);
  const vel = Math.abs(m.oneHourChange);
  
  let action = "SKIP";
  if (vel > 0.02) action = "SKIP (high velocity)";
  else if (absEdge >= 0.08) action = "BUY";
  else if (absEdge >= 0.03) action = "WATCH";
  
  const emoji = action.startsWith("BUY") ? "🎯" : action === "WATCH" ? "👀" : "⏭️";
  return `${emoji} ${m.question.slice(0, 55)}: ${side} @ ${m.yesPrice.toFixed(3)} | Est: ${(prob*100).toFixed(0)}% | Edge: ${(edge*100).toFixed(1)}% | ${action}`;
}

// SCAN MARKETS
const scanMarketsAction: Action = {
  name: "SCAN_MARKETS",
  description: "Scan Polymarket for mispriced markets with potential trading edges",
  similes: [
    "scan markets", "find edges", "check polymarket", "trading signals",
    "what should i bet on", "show me opportunities", "find opportunities",
    "scan prediction markets", "market scan"
  ],
  validate: async () => true,
  handler: async (runtime, message, state, _options, callback) => {
    callback({ text: "📡 Scanning Polymarket for edges..." });
    
    try {
      const markets = await fetchMarkets(100);
      markets.sort((a, b) => b.volume24h - a.volume24h);
      const top = markets.slice(0, 15);
      
      // Use LLM to quickly assess top markets
      const marketList = top.map((m, i) => 
        `${i+1}. "${m.question}" — YES @ ${m.yesPrice.toFixed(3)}, 1h change: ${(m.oneHourChange*100).toFixed(1)}%, vol24h: $${m.volume24h.toLocaleString()}`
      ).join("\n");
      
      const prompt = `You are JARVIS-PM, a prediction market analyst. Assess these markets and identify the 3 with the clearest edges vs fair value. For each, estimate the true probability and calculate the edge.

Markets (by volume):
${marketList}

For each promising market, output exactly:
SIGNAL: [market question] | [YES/NO] @ [market price] | Est: [your probability]% | Edge: [edge%] | [BUY/WATCH/SKIP]

Only output SIGNAL lines, no other text. Focus on markets where your estimate diverges >5% from market price.`;

      const response = await generateText({
        runtime,
        context: prompt,
        modelClass: ModelClass.LARGE,
      });
      
      const signals = response.split("\n")
        .filter(l => l.startsWith("SIGNAL:"))
        .map(l => l.replace("SIGNAL:", "").trim())
        .slice(0, 5);
      
      if (signals.length === 0) {
        callback({ text: "📊 Scanned top 15 markets — no clear edges found. Markets appear fairly priced. Check back in 2h or research a specific market with 'research [topic]'." });
      } else {
        callback({ text: `📡 **Polymarket Signal Scan**\n\n${signals.map(s => `🎯 ${s}`).join("\n")}\n\n_Use 'research [market]' for deep analysis. Edges update in real-time._` });
      }
    } catch (err) {
      callback({ text: `❌ Scan error: ${(err as Error).message}. Check Polymarket API connectivity.` });
    }
    return true;
  },
  examples: [[
    { user: "user", content: { text: "scan markets" }},
    { user: "JARVIS-PM", content: { text: "📡 Scanning Polymarket for edges..." }},
  ]],
};

// RESEARCH MARKET — with real LLM call
const researchMarketAction: Action = {
  name: "RESEARCH_MARKET",
  description: "Deep research and probability estimate for a specific prediction market",
  similes: [
    "research", "analyze", "investigate", "what do you think about",
    "check odds on", "estimate probability", "probability of", "chance of",
    "will [something] happen", "assess"
  ],
  validate: async () => true,
  handler: async (runtime, message, state, _options, callback) => {
    const text = (message.content.text || "").toLowerCase();
    
    try {
      const markets = await fetchMarkets(300);
      
      // Extract query keywords
      const stopWords = new Set(["research", "analyze", "investigate", "check", "odds", "on", "the", "a", "an", "what", "think", "about", "probability", "of", "chance", "will", "happen"]);
      const keywords = text.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
      
      const match = markets
        .sort((a, b) => b.volume24h - a.volume24h)
        .find(m => keywords.some(kw => m.question.toLowerCase().includes(kw)));
      
      if (!match) {
        callback({ text: `❓ No market found matching your query. Try: 'research iran ceasefire' or 'research brazil world cup'` });
        return true;
      }
      
      callback({ text: `🔍 Researching: **${match.question}**\nMarket: YES @ ${match.yesPrice.toFixed(3)} | 1h: ${(match.oneHourChange*100).toFixed(1)}% | Vol24h: $${match.volume24h.toLocaleString()}\n\nAnalyzing with Qwen3.5-27B...` });
      
      const researchPrompt = `You are JARVIS-PM, a prediction market analyst with deep expertise in geopolitics, finance, and current events. Research this question and provide a probability estimate.

**Question:** "${match.question}"
**Market price:** YES @ ${match.yesPrice.toFixed(3)} (${(match.yesPrice*100).toFixed(1)}%)
**1-hour price change:** ${(match.oneHourChange*100).toFixed(2)}%
**24h trading volume:** $${match.volume24h.toLocaleString()}

Analyze this market based on:
1. Base rates for this type of event
2. Current geopolitical/market context
3. Historical precedents
4. Time remaining and resolution criteria

Provide:
- **My probability estimate:** X% YES
- **Key factors:** (2-3 bullets)
- **Market assessment:** overpriced / underpriced / fair
- **Edge:** +X% or -X% vs market price
- **Signal:** BUY YES / BUY NO / WATCH / SKIP
- **Confidence:** low / medium / high
- **Odds velocity note:** ${Math.abs(match.oneHourChange) > 0.02 ? "⚠️ High velocity — informed flow detected, size down" : Math.abs(match.oneHourChange) > 0.005 ? "⚡ Medium velocity" : "✅ Low velocity — undiscovered edge"}`;
      
      const analysis = await generateText({
        runtime,
        context: researchPrompt,
        modelClass: ModelClass.LARGE,
      });
      
      callback({ text: `📊 **Analysis: ${match.question}**\n\n${analysis}` });
    } catch (err) {
      callback({ text: `❌ Research error: ${(err as Error).message}` });
    }
    return true;
  },
  examples: [[
    { user: "user", content: { text: "research iran ceasefire" }},
    { user: "JARVIS-PM", content: { text: "🔍 Researching..." }},
  ]],
};

// AUTO-SCAN on startup (runs every 2h)
export function startScheduledScan(runtime: IAgentRuntime) {
  const SCAN_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours
  
  const runScan = async () => {
    try {
      const markets = await fetchMarkets(50);
      markets.sort((a, b) => b.volume24h - a.volume24h);
      
      // Quick score without LLM (velocity-based filter only)
      const opportunities = markets.filter(m => {
        const vel = Math.abs(m.oneHourChange);
        const fromMid = Math.abs(m.yesPrice - 0.5);
        return vel <= 0.005 && fromMid >= 0.15; // low velocity, away from 50/50
      }).slice(0, 3);
      
      if (opportunities.length > 0) {
        console.log(`[AutoScan] Found ${opportunities.length} quiet markets worth researching:`);
        opportunities.forEach(m => {
          console.log(`  ${m.question} — YES @ ${m.yesPrice.toFixed(3)} | 1h: ${(m.oneHourChange*100).toFixed(2)}%`);
        });
      }
    } catch (err) {
      console.error("[AutoScan] Error:", err);
    }
  };
  
  // Run immediately, then every 2h
  runScan();
  setInterval(runScan, SCAN_INTERVAL_MS);
}

export const polymarketPlugin: Plugin = {
  name: "plugin-polymarket",
  description: "Polymarket prediction market scanning and research agent — live edges, probability estimates, trading signals",
  actions: [scanMarketsAction, researchMarketAction],
  providers: [],
  evaluators: [],
};

export default polymarketPlugin;
