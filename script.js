const feed = document.getElementById("news-feed");
const loading = document.getElementById("loading");
const noResults = document.getElementById("no-results");
const searchBox = document.getElementById("search-box");
const modal = document.getElementById("news-modal");
const modalBody = document.getElementById("modal-body");
const closeModal = document.getElementById("close-modal");
const commentsList = document.getElementById("comments-list");
const commentInput = document.getElementById("comment-input");
const nameInput = document.getElementById("name-input");
const postCommentBtn = document.getElementById("post-comment");
const savedArticlesFeed = document.getElementById("saved-articles-feed");

console.log("News feed element:", feed); // Debug: Verify feed element

let page = 1;
let query = "";
let isLoading = false;
let currentArticleUrl = "";
let pollingInterval;

// Check if we're on the saved articles page
const isSavedPage = window.location.pathname.includes("saved");

async function fetchNews(query = "", page = 1) {
  const articles = [];
  const safeQuery = encodeURIComponent(query.trim() || "technology");

  try {
    const response = await fetch(`/api/news?query=${safeQuery}&page=${page}`);
    if (!response.ok) throw new Error("Failed to fetch news");
    const data = await response.json();
    console.log("Fetched data:", data); // Debug: Raw response
    if (data.articles && Array.isArray(data.articles)) {
      const cleaned = data.articles.map((article) => ({
        title: article.title,
        description: article.description || "No description available",
        image: article.urlToImage || "https://via.placeholder.com/300",
        url: article.url,
        author: article.author || "Unknown",
        publishedAt: article.publishedAt || new Date().toISOString(),
        source: "NewsAPI",
      }));
      articles.push(...cleaned);
    } else {
      console.warn("No articles returned from server", data);
    }
  } catch (error) {
    console.error("Fetch news error:", error);
  }
  console.log("Processed articles:", articles); // Debug: Filtered articles
  return articles;
}

async function fetchComments(articleUrl) {
  try {
    const response = await fetch(`/comments/${encodeURIComponent(articleUrl)}`);
    if (!response.ok) throw new Error("Failed to fetch comments");
    return await response.json();
  } catch (error) {
    console.error("Fetch comments error:", error);
    return [];
  }
}

async function postComment(articleUrl, name, text) {
  try {
    const response = await fetch("/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleUrl, name, text }),
    });
    if (!response.ok) throw new Error("Failed to post comment");
  } catch (error) {
    console.error("Post comment error:", error);
  }
}

function displayNews(articles, container) {
  console.log("Displaying articles:", articles); // Debug
  articles.forEach((article) => {
    const div = document.createElement("div");
    div.className = "article";
    div.innerHTML = `
      <img src="${article.image}" alt="${article.title}">
      <h2>${article.title}</h2>
      <p>${article.description || "No description available"}</p>
    `;
    div.addEventListener("click", () => showFullNews(article));
    container.appendChild(div);
  });
}

function displayComments(comments) {
  commentsList.innerHTML = "";
  comments.forEach((comment) => {
    const div = document.createElement("div");
    div.className = "comment";
    div.innerHTML = `<strong>${comment.name}</strong>: ${comment.text}`;
    commentsList.appendChild(div);
  });
  commentsList.scrollTop = commentsList.scrollHeight;
}

function getSavedArticles() {
  return JSON.parse(localStorage.getItem("savedArticles")) || [];
}

function saveArticle(article) {
  const savedArticles = getSavedArticles();
  if (!savedArticles.some((a) => a.url === article.url)) {
    savedArticles.push(article);
    localStorage.setItem("savedArticles", JSON.stringify(savedArticles));
  }
}

function removeArticle(articleUrl) {
  const savedArticles = getSavedArticles().filter((a) => a.url !== articleUrl);
  localStorage.setItem("savedArticles", JSON.stringify(savedArticles));
}

function isArticleSaved(articleUrl) {
  return getSavedArticles().some((a) => a.url === articleUrl);
}

function showFullNews(article) {
  currentArticleUrl = article.url;
  const publishedDate = new Date(article.publishedAt).toLocaleDateString();
  const author = article.author || "Anonymous";
  const image = article.image;
  const isSaved = isArticleSaved(article.url);

  modalBody.innerHTML = `
    <h2>${article.title}</h2>
    <p class="meta">${publishedDate} | Author: ${author} | Source: ${
    article.source
  }</p>
    <img src="${image}" alt="${article.title}">
    <p>${article.description || "No description available"}</p>
    <p>${article.content || "Full content not available via API."}</p>
    <div class="button-container">
      <button class="see-more" onclick="window.open('${
        article.url
      }', '_blank')">See More</button>
      <button id="save-article-btn" class="save-article-btn ${
        isSaved ? "saved" : ""
      }">${isSaved ? "Unsave" : "Save for Later"}</button>
    </div>
  `;

  modal.style.display = "block";
  fetchComments(currentArticleUrl).then(displayComments);
  pollingInterval = setInterval(
    () => fetchComments(currentArticleUrl).then(displayComments),
    2000
  );

  // Reattach event listener for save button
  const saveArticleBtn = document.getElementById("save-article-btn");
  saveArticleBtn.onclick = () => {
    if (isArticleSaved(article.url)) {
      removeArticle(article.url);
      saveArticleBtn.textContent = "Save for Later";
      saveArticleBtn.classList.remove("saved");
    } else {
      saveArticle(article);
      saveArticleBtn.textContent = "Unsave";
      saveArticleBtn.classList.add("saved");
    }
    // Refresh saved articles feed if on saved page
    if (isSavedPage) {
      savedArticlesFeed.innerHTML = "";
      loadSavedArticles();
    }
  };
}

function loadSavedArticles() {
  const savedArticles = getSavedArticles();
  if (savedArticles.length === 0) {
    noResults.style.display = "block";
  } else {
    noResults.style.display = "none";
    displayNews(savedArticles, savedArticlesFeed);
  }
}

postCommentBtn.addEventListener("click", (e) => {
  e.preventDefault(); // Prevent form submission
  const commentText = commentInput.value.trim();
  const commenterName = nameInput.value.trim();
  if (commentText && commenterName && currentArticleUrl) {
    postComment(currentArticleUrl, commenterName, commentText);
    commentInput.value = "";
    nameInput.value = "";
    fetchComments(currentArticleUrl).then(displayComments);
  }
});

closeModal.addEventListener("click", () => {
  modal.style.display = "none";
  clearInterval(pollingInterval);
});

window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
    clearInterval(pollingInterval);
  }
});

async function loadNews(clearFeed = false) {
  if (isLoading) return;
  isLoading = true;
  loading.style.display = "block";
  noResults.style.display = "none";

  if (clearFeed) {
    feed.innerHTML = "";
    page = 1;
  }

  const articles = await fetchNews(query, page);
  console.log("Articles to display:", articles); // Debug
  if (articles.length === 0 && page === 1) {
    noResults.style.display = "block";
  } else {
    displayNews(articles, feed);
  }

  loading.style.display = "none";
  isLoading = false;
}

if (!isSavedPage) {
  window.addEventListener("scroll", () => {
    if (
      window.scrollY + window.innerHeight >= document.body.offsetHeight - 100 &&
      !isLoading &&
      feed
    ) {
      page++;
      loadNews();
    }
  });

  if (searchBox) {
    let searchTimeout;
    searchBox.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        query = searchBox.value.trim();
        loadNews(true);
      }, 500);
    });
  }

  // Trigger initial load for news feed
  loadNews(true);
} else {
  // Load saved articles for saved page
  loadSavedArticles();
}
