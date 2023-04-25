import express from "express";
import fetch from "node-fetch";
import cheerio from "cheerio";
import cors from "cors";
import URL from "url";
import { checkForCache, createCache } from "./lib/cache.js";
import expressLimiter from "express-limiter";
import { createClient } from "redis";

const app = express();

app.use(cors());

if (process.env.REDISTOGO_URL) {
  var rtg = URL.parse(process.env.REDISTOGO_URL);

  var redis = createClient(rtg.port, rtg.hostname);

  redis.auth(rtg.auth.split(":")[1]);
} else {
  var redis = createClient();
}

const limiter = expressLimiter(app, redis);

limiter({
  path: "/metadata",
  method: "get",
  lookup: ["connection.remoteAddress"],
  // 300 requests per minute
  total: 500,
  expire: 1000 * 60,
});

app.get("/metadata", async (req, res) => {
  const { url } = req.query;

  try {
    if (!url) {
      return res.set("Access-Control-Allow-Origin", "*").status(400).json({ error: "Invalid URL" });
    }

    url = url.indexOf("://") === -1 ? "http://" + url : url;

    const isUrlValid = /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi.test(url);

    if (!url || !isUrlValid) {
      return res.set("Access-Control-Allow-Origin", "*").status(400).json({ error: "Invalid URL" });
    }

    if (url && isUrlValid) {
      // check if url is cached
      const cached = await checkForCache(url);

      // if we have a cached version, return it
      if (cached) {
        return res.set("Access-Control-Allow-Origin", "*").status(200).json(cached);
      }

      const response = await fetch(url);
      const html = await response.text();
      const lpUrl = URL.parse(response.url);
      const $ = cheerio.load(html);

      const title = $("head title").text().trim();
      const description = $('head meta[name="description"]').attr("content");
      const image = $('head meta[property="og:image"]').attr("content");
      let output = { title, description, image, url, hostname: lpUrl.hostname, siteName: url };

      res.status(200).json(output);
      
      // cache the result
      if (!cached && output) {
        await createCache({
          url,
          title: output.title,
          description: output.description,
          image: output.image,
          siteName: output.siteName,
          hostname: output.hostname,
        });
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch metadata." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
