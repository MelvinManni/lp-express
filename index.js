import express from "express";
import fetch from "node-fetch";
import cheerio from "cheerio";
import cors from "cors";
import URL from "url";

const app = express();

app.use(cors());

app.get("/metadata", async (req, res) => {
  const { url } = req.query;

  try {
    const response = await fetch(url);
    const html = await response.text();
    const lpUrl = URL.parse(response.url);
    const $ = cheerio.load(html);
    
    const title = $('head title').text().trim();
    const description = $('head meta[name="description"]').attr('content');
    const image = $('head meta[property="og:image"]').attr('content');

    res.json({ title, description, image, url, hostname: lpUrl.hostname, siteName: url});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch metadata." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});