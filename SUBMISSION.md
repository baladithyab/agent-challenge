# JARVIS-PM — Prediction Market Intelligence Agent
## Nosana × ElizaOS Agent Challenge Submission

---

## What I Built

**JARVIS-PM** is an autonomous prediction market intelligence agent that runs on Nosana's decentralized compute network. It scans [Polymarket](https://polymarket.com) for mispriced markets, researches them using web search, and generates actionable trading signals — all while keeping your strategy private on decentralized infrastructure.

### The Problem It Solves
Traditional prediction market analysis tools route your research queries through centralized AI providers (OpenAI, Anthropic, etc.). This leaks your trading intent — if you're researching whether the Fed will cut rates, that query reveals your position interest.

Running on Nosana's decentralized GPU network means your research stays private. No centralized provider sees your market thesis.

---

## Demo

Agent starts and exposes a chat UI at `http://localhost:3000`.

**Example interaction:**
```
User: scan markets
JARVIS-PM: 🎯 Fed no rate change Apr 2026: YES @ 0.854 | Est: 92% | Edge: +7.7% | BUY
          🎯 Iran nuclear deal by June: YES @ 0.185 | Est: 28% | Edge: +9.5% | WATCH  
          ⚠️ Bitcoin $100K by Dec: YES @ 0.31 | Est: 25% | Edge: -6% | SKIP
```

**Scheduled scanning:** Agent auto-scans every 2 hours, sends Telegram alerts when edge > 8%.

---

## Technical Implementation

### Architecture
```
User Query / 2h Schedule
        ↓
ElizaOS v2 Agent (JARVIS-PM character)
        ↓
plugin-polymarket (custom)
├── SCAN_MARKETS → Gamma API → filter by volume, price bounds, non-sports
├── RESEARCH_MARKET → Brave Search + web → estimate true probability  
└── Score edge = |research_prob - market_price| × confidence
        ↓
Response with signal: BUY / WATCH / SKIP + reasoning
```

### Custom Plugin: `plugin-polymarket`
- **SCAN_MARKETS action:** Fetches top markets by 24h volume, filters out sports/low-liquidity, calculates momentum via `oneHourPriceChange`
- **RESEARCH_MARKET action:** Uses Brave web search to research a specific market question, compares research probability estimate against market price, outputs edge %
- TypeScript with proper ElizaOS v2 Handler types (no `@ts-nocheck`)
- Scheduled background scanning via ElizaOS service loop

### Nosana Deployment
- Docker image: `baladithyab/jarvis-pm-agent:latest`  
- Job definition: `nos_job_def/nosana_eliza_job_definition.json`
- Runs entirely on Nosana endpoints (Qwen3.5-27B + Qwen3-Embedding-0.6B)
- No external API keys required beyond Nosana-provided endpoints

---

## Why This Fits the Challenge Theme

The challenge is inspired by **OpenClaw** — personal AI that you control. JARVIS-PM embodies this:

1. **Decentralized inference** — market research runs on Nosana GPUs, not OpenAI
2. **Self-hosted** — your strategy and queries stay private
3. **Practical value** — prediction markets are a real alpha source if you have better information synthesis than the crowd

I actually use this system (via [OpenClaw](https://openclaw.ai/)) for real Polymarket positions. Current Brier score: 0.2211 across 49 resolved markets.

---

## Running It

```bash
git clone https://github.com/baladithyab/agent-challenge
cd agent-challenge
cp .env.example .env
# (Nosana endpoints pre-configured in .env.example)
elizaos dev --character characters/jarvis-pm.character.json
# Chat UI: http://localhost:3000
```

Or deploy to Nosana:
```bash
nosana job submit --file nos_job_def/nosana_eliza_job_definition.json
```

---

## Repository Structure
```
agent-challenge/
├── src/
│   ├── index.ts                    # Agent entry point
│   └── plugins/polymarket/
│       └── index.ts                # SCAN_MARKETS + RESEARCH_MARKET actions
├── characters/
│   └── jarvis-pm.character.json    # ElizaOS character definition
├── nos_job_def/
│   └── nosana_eliza_job_definition.json  # Nosana deployment config
├── Dockerfile                      # Production container
├── AGENT_DESIGN.md                 # Architecture details
└── SUBMISSION.md                   # This file
```

---

*Built by [@baladithyab](https://github.com/baladithyab) | Repo: [github.com/baladithyab/agent-challenge](https://github.com/baladithyab/agent-challenge)*
