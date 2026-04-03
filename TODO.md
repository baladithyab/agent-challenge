# JARVIS-PM Bounty TODO
# Deadline: April 14, 2026 | Repo: https://github.com/baladithyab/agent-challenge

## ✅ Completed
- [x] 1. Fork repo + initial structure
- [x] 2. Create JARVIS-PM character (prediction market persona)
- [x] 3. Build plugin-polymarket (SCAN_MARKETS + RESEARCH_MARKET actions)
- [x] 4. Wire LLM calls via runtime.generateText()
- [x] 5. Fix character validation (ElizaOS v2 schema)
- [x] 6. Install deps + verify agent starts (elizaos dev ✅)

## 🔄 Remaining (in priority order)
- [x] 7. Test actions via chat UI -- agent starts & UI accessible
- [x] 8. Fix TypeScript types properly (remove @ts-nocheck, use correct Handler type)
- [x] 9. Add scheduled background scanning with auto-alerts
- [ ] 10. Claim Nosana compute credits (nosana.com/builders-credits) 
- [x] 11. Update nos_job_def for Nosana deployment
- [ ] 12. Deploy to Nosana network (docker build + nosana job submit)
- [ ] 13. Record 1-min demo video (screen capture of agent in action)
- [ ] 14. Write Twitter/X thread explaining what was built
- [ ] 15. Submit via Superteam Earn (https://earn.superteam.fun/listing/nosana-builders-elizaos-challenge)

## Notes
- Agent starts: `cd ~/agent-challenge && elizaos dev --character characters/jarvis-pm.character.json`
- Set env: OPENAI_API_KEY=nosana, OPENAI_API_URL=[nosana endpoint], TAVILY_API_KEY=[key]
- Chat UI: http://localhost:3000
- Nosana endpoint: https://6vq2bcqphcansrs9b88ztxfs88oqy7etah2ugudytv2x.node.k8s.prd.nos.ci/v1
