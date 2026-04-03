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
- [ ] 12. Deploy to Nosana network (docker push BLOCKED: need docker login -- run: docker login -u baladithyab, then re-run push)
- [ ] 13. Record 1-min demo video (screen capture of agent in action)
- [x] 14. Write Twitter/X thread explaining what was built (TWITTER_THREAD.md ready)
- [ ] 15. Submit via Superteam Earn (https://earn.superteam.fun/listing/nosana-builders-elizaos-challenge)

## Notes
- Agent starts: `cd ~/agent-challenge && elizaos dev --character characters/jarvis-pm.character.json`
- Set env: OPENAI_API_KEY=nosana, OPENAI_API_URL=[nosana endpoint], TAVILY_API_KEY=[key]
- Chat UI: http://localhost:3000
- Nosana endpoint: https://6vq2bcqphcansrs9b88ztxfs88oqy7etah2ugudytv2x.node.k8s.prd.nos.ci/v1

## Status Update — 2026-04-03 13:18 PT
- TODO #12 (docker push): BLOCKED — `denied: requested access to the resource is denied`
  - Image exists locally: `baladithyab/jarvis-pm-agent:latest` (2.08GB)
  - No Docker Hub credentials cached (~/.docker/config.json missing)
  - **ACTION NEEDED FROM BALA:** Run `docker login -u baladithyab` and enter Docker Hub password/token
    Then run: `docker push baladithyab/jarvis-pm-agent:latest`
- TODO #10 (compute credits): Visit https://nosana.com/builders-credits with wallet connected
- TODO #13 (demo video): Record ~1min screen capture of `elizaos dev` + chat UI interaction
- TODO #14 (Twitter thread): TWITTER_THREAD.md exists — review and post
- TODO #15 (submit): https://earn.superteam.fun/listing/nosana-builders-elizaos-challenge
