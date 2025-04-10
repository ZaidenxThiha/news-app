const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

let comments = {};

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/saved", (req, res) => {
  res.sendFile(path.join(__dirname, "saved.html"));
});

app.get("/api-key", (req, res) => {
  res.json({ apiKey: "674217eb438c41da81c972d03132519a" });
});

app.get("/comments/:articleUrl", (req, res) => {
  const articleUrl = decodeURIComponent(req.params.articleUrl);
  res.json(comments[articleUrl] || []);
});

app.post("/comments", (req, res) => {
  const { articleUrl, text } = req.body;
  if (!comments[articleUrl]) comments[articleUrl] = [];
  comments[articleUrl].push({ text, timestamp: new Date().toISOString() });
  res.status(201).send();
});

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
