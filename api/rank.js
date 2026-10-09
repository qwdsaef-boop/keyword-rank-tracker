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
  const location = String(body.location || "").trim();

  if (!keyword || !rawDomain) {
    return res.status(400).json({ error: "Enter both a keyword and a website domain." });
  }
  if (keyword.length > 200 || rawDomain.length > 253 || location.length > 100) {
    return res.status(400).json({ error: "One or more fields are too long." });
  }
  const allowedCountries = new Set(["in", "us", "gb", "ae", "au", "ca", "sg"]);
  if (!allowedCountries.has(country)) {
    return res.status(400).json({ error: "Unsupported country selection." });
  }

  const domain = normalizeDomain(rawDomain);
  if (!domain || !domain.includes(".") || domain.includes(" ")) {
    return res.status(400).json({ error: "Enter a valid domain, such as example.com." });
  }

  const payload = {
    q: keyword,
    gl: country,
    hl: country === "in" || country === "sg" || country === "ae" ? "en" : "en",
    num: 10
  };
  if (location) payload.location = location;

  try {
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
    let match = null;

    for (let i = 0; i < organic.length; i++) {
      const item = organic[i];
      const url = String(item.link || "");
      if (!url) continue;

      const resultDomain = normalizeDomain(url);
      if (resultDomain === domain || resultDomain.endsWith("." + domain)) {
        const position = Number(item.position) || (i + 1);
        match = { position, url };
        break;
      }
    }

    return res.status(200).json({
      keyword,
      domain,
      locationLabel: location || country.toUpperCase(),
      found: Boolean(match),
      position: match ? match.position : null,
      url: match ? match.url : null,
      checkedResults: organic.length
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
