---
name: searxng_search
description: Use the local SearXNG instance (metasearch) as a free web search backend.
metadata: {"openclaw": {"emoji": "🔎", "requires": {"bins": ["curl"]}}}
---

# SearXNG Search (local)

Use this skill to search the web without Brave.

## Endpoint

- Local endpoint: `http://127.0.0.1:8080/search`
- Use `format=json`.

## Procedure

1) Convert the user's request into a short search query.
2) Use `exec` with curl to fetch JSON:

```bash
curl -sS -m 20 'http://127.0.0.1:8080/search?q=<QUERY>&format=json'
```

3) Parse the JSON results and return:
- top 5 titles + URLs
- 1-2 sentence summary of what you found

## Notes

- Prefer fewer queries: refine the query rather than spamming searches.
- If SearXNG returns 0 results, try a broader query.
