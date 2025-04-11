const express = require("express");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from .env file
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

// Fetch news from NewsAPI
app.get("/api/news", async (req, res) => {
  const { query = "technology", page = 1 } = req.query;

  const apiKey = process.env.NEWS_API_KEY; // 
  const safeQuery = encodeURIComponent(query.trim() || "technology");
  const url = `https://newsapi.org/v2/everything?q=${safeQuery}&page=${page}&pageSize=10&apiKey=${apiKey}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NewsAPI responded with status: ${response.status}`); 
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Failed to fetch news:", error);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// Fetch comments for an article
app.get("/comments/:articleUrl", (req, res) => {
  const articleUrl = decodeURIComponent(req.params.articleUrl);
  res.json(comments[articleUrl] || []);
});

// Post a comment for an article
app.post("/comments", (req, res) => {
  const { articleUrl, text } = req.body;
  if (!articleUrl || !text) {
    return res.status(400).json({ error: "Missing articleUrl or text" });
  }
  if (!comments[articleUrl]) comments[articleUrl] = [];
  comments[articleUrl].push({ text, timestamp: new Date().toISOString() });
  res.status(201).send();
});

// Start the server
app.listen(3001, () => {
  console.log("✅ Server running on http://localhost:3001");
});
