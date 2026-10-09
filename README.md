# RankCheck Free Keyword Rank Checker (MVP)

This is a small static website with a Vercel serverless API endpoint. It checks whether a domain appears in the first 10 organic results returned by Serper.

## Files
- `index.html`: frontend form and result display
- `api/rank.js`: backend endpoint; keeps the Serper API key on the server
- `vercel.json`: Vercel function configuration

## Deploy to a free Vercel URL

1. Create a GitHub account if you don't already have one.
2. Create a new GitHub repository, e.g. `rankcheck-free`.
3. Upload `index.html`, `vercel.json`, and the `api` folder with `rank.js` to the repository root.
4. Sign in at https://vercel.com/ and choose **Add New → Project**.
5. Import the GitHub repository and deploy.
6. In the Vercel project, open **Settings → Environment Variables**.
7. Add:
   - Name: `SERPER_API_KEY`
   - Value: your Serper API key
   - Environment: Production (and Preview if desired)
8. Redeploy the project after adding the environment variable.
9. Open the generated `*.vercel.app` URL and test one keyword.

## Notes before sharing publicly
- The API key is read only from the server environment; do not put it in `index.html`.
- This prototype makes one Serper request per check and searches only the first 10 organic results.
- A result not found in the first 10 is shown as “Not found in the first 10 organic results,” not as unranked or unindexed.
- The first version does not have login, usage quotas, CAPTCHA, or persistent history. Add rate limiting/abuse protection before promoting it widely; otherwise strangers could consume your API quota.
- Verify location behaviour and the positions returned by Serper for your chosen search settings.
- The `location` field is passed to Serper as a free-text location. Search provider support and matching may vary.
