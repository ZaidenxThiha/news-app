const express = require("express");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// In-memory comment storage
let comments = {};

// Serve homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Serve saved articles page
app.get("/saved", (req, res) => {
  res.sendFile(path.join(__dirname, "saved.html"));
});

// Fetch news from NewsAPI with multiple key fallback
app.get("/api/news", async (req, res) => {
  const { query = "technology", page = 1 } = req.query;
  const apiKeys = [
    process.env.NEWS_API_KEY_1,
    process.env.NEWS_API_KEY_2,
    process.env.NEWS_API_KEY_3,
    process.env.NEWS_API_KEY_4,
    process.env.NEWS_API_KEY_5,
  ].filter((key) => key); // Remove undefined keys

  if (apiKeys.length === 0) {
    console.error("No NEWS_API_KEYs set");
    return res
      .status(500)
      .json({ error: "Server configuration error: Missing API keys" });
  }

  const safeQuery = encodeURIComponent(query.trim() || "technology");

  for (const apiKey of apiKeys) {
    const url = `https://newsapi.org/v2/everything?q=${safeQuery}&page=${page}&pageSize=10&apiKey=${apiKey}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`NewsAPI responded with status: ${response.status}`);
      }
      const data = await response.json();
      return res.json(data); // Success, return data
    } catch (error) {
      console.error(
        `Failed with key ending in ${apiKey.slice(-4)}:`,
        error.message
      );
      // Continue to next key
    }
  }

  // All keys failed
  console.error("All API keys failed");
  res
    .status(500)
    .json({ error: "Failed to fetch news with all provided keys" });
});

// Fetch comments for an article
app.get("/comments/:articleUrl", (req, res) => {
  const articleUrl = decodeURIComponent(req.params.articleUrl);
  res.json(comments[articleUrl] || []);
});

// Post a comment for an article
app.post("/comments", (req, res) => {
  const { articleUrl, name, text } = req.body;
  if (!articleUrl || !name || !text) {
    return res.status(400).json({ error: "Missing articleUrl, name, or text" });
  }
  if (!comments[articleUrl]) comments[articleUrl] = [];
  comments[articleUrl].push({
    name,
    text,
    timestamp: new Date().toISOString(),
  });
  res.status(201).send();
});

// Start the server
app.listen(3001, () => {
  console.log("✅ Server running on http://localhost:3001");
});
