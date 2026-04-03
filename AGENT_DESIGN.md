# JARVIS Prediction Market Intelligence Agent
## Nosana × ElizaOS Challenge Submission

### What It Does
An autonomous prediction market research and trading signals agent that:
1. **Scans Polymarket** — monitors high-volume markets for pricing inefficiencies
2. **Multi-source research** — cross-references news, Reddit, Google Trends against market prices
3. **Signal generation** — outputs BUY/SKIP/WATCH signals with confidence scores and reasoning
4. **Telegram alerts** — notifies user when actionable edges are found
5. **Conversational interface** — ask "what's the edge on Iran ceasefire markets?" and get analysis

### Why This Wins
- Directly inspired by OpenClaw (the challenge theme)
- Novel use case: prediction markets + decentralized AI = no centralized data leakage
- Working demo with real Polymarket data
- Practical: this agent would actually make money

### Architecture
```
User Query / Scheduled Scan
        ↓
ElizaOS Agent (character: JARVIS-PM)
        ↓ 
[Custom Actions]
├── scanMarkets()     → Gamma API → filter by edge, velocity
├── researchMarket()  → Brave Search + Reddit → summarize signal
├── scoreEdge()       → compare research prob vs market price
└── alertUser()       → Telegram notification with trade recommendation
        ↓
Response: "🎯 Iran ceasefire Apr 15: YES @ 0.185 | Research: 28% conf | Edge: +9.5% | BUY"
```

### ElizaOS Plugins Used
- `@elizaos/plugin-bootstrap` — base
- `@elizaos/plugin-openai` — Nosana Qwen3.5 endpoint
- `@elizaos/plugin-web-search` — Brave/news research
- `@elizaos/plugin-telegram` — alert delivery
- Custom plugin: `plugin-polymarket` — CLOB API integration

### Deployment
Runs on Nosana decentralized compute as a persistent agent service.
No centralized server. Your prediction market alpha stays private.
