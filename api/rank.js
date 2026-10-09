module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "The search API is not configured yet. Please try again later."
    });
  }

  const body = req.body || {};
  const keyword = String(body.keyword || "").trim();
  const rawDomain = String(body.domain || "").trim();
  const country = String(body.country || "in").trim().toLowerCase();
  // Accepted from the UI for display/diagnostics. Serper does not guarantee device-specific SERPs.
  const device = String(body.device || "desktop").trim().toLowerCase();

  if (!keyword || !rawDomain) {
    return res.status(400).json({ error: "Enter both a keyword and a website domain." });
  }
  if (keyword.length > 200 || rawDomain.length > 253) {
    return res.status(400).json({ error: "One or more fields are too long." });
  }

  const allowedCountries = new Set(["in", "us", "gb", "ae", "au", "ca", "sg"]);
  if (!allowedCountries.has(country)) {
    return res.status(400).json({ error: "Unsupported country selection." });
  }
  if (!["desktop", "mobile"].includes(device)) {
    return res.status(400).json({ error: "Unsupported device selection." });
  }

  const domain = normalizeDomain(rawDomain);
  if (!domain || !domain.includes(".") || domain.includes(" ")) {
    return res.status(400).json({ error: "Enter a valid domain, such as example.com." });
  }

  try {
    let checkedResults = 0;

    // Request one page at a time and stop immediately when the domain is found.
    // This uses Serper's page parameter; verify account/API support if the provider changes its pagination behaviour.
    for (let page = 1; page <= 10; page++) {
      const payload = {
        q: keyword,
        gl: country,
        hl: "en",
        num: 10,
        page
      };

      const apiResponse = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const rawText = await apiResponse.text();
      if (!apiResponse.ok) {
        console.error("Serper API error", apiResponse.status, rawText.slice(0, 300));
        return res.status(502).json({
          error: "The search provider could not complete the request. Please try again later."
        });
      }

      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        return res.status(502).json({ error: "The search provider returned an invalid response." });
      }

      const organic = Array.isArray(data.organic) ? data.organic : [];
      if (organic.length === 0) break;

      for (let i = 0; i < organic.length; i++) {
        const item = organic[i];
        const url = String(item.link || "");
        if (!url) continue;

        const resultDomain = normalizeDomain(url);
        const position = (page - 1) * 10 + (Number(item.position) || i + 1);
        checkedResults = Math.max(checkedResults, position);

        if (resultDomain === domain || resultDomain.endsWith("." + domain)) {
          return res.status(200).json({
            keyword,
            domain,
            country,
            device,
            deviceSpecific: false,
            found: true,
            position,
            url,
            checkedResults
          });
        }
      }

      checkedResults = (page - 1) * 10 + organic.length;
      if (organic.length < 10) break;
    }

    return res.status(200).json({
      keyword,
      domain,
      country,
      device,
      deviceSpecific: false,
      found: false,
      position: null,
      url: null,
      checkedResults
    });
  } catch (error) {
    console.error("Rank check failed", error);
    return res.status(502).json({ error: "Unable to reach the search provider. Please try again." });
  }
};

function normalizeDomain(value) {
  let text = String(value || "").trim().toLowerCase();
  text = text.replace(/^https?:\/\//, "");
  text = text.split(/[/?#]/)[0];
  text = text.replace(/^www\./, "").replace(/\.$/, "");
  return text;
}
