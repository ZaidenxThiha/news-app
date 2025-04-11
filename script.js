let apiKey;
const feed = document.getElementById("news-feed");
const loading = document.getElementById("loading");
const noResults = document.getElementById("no-results");
const searchBox = document.getElementById("search-box");
const modal = document.getElementById("news-modal");
const modalBody = document.getElementById("modal-body");
const closeModal = document.getElementById("close-modal");
const commentsList = document.getElementById("comments-list");
const commentInput = document.getElementById("comment-input");
const postCommentBtn = document.getElementById("post-comment");
const saveArticleBtn = document.getElementById("save-article-btn");
const savedArticlesFeed = document.getElementById("saved-articles-feed");
let page = 1;
let query = "";
let isLoading = false;
let currentArticleUrl = "";
let pollingInterval;

async function fetchApiKey() {
  try {
    const response = await fetch("/api-key");
    if (!response.ok) throw new Error("Failed to fetch API key");
    const data = await response.json();
    return data.apiKey;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function fetchNews(query = "", page = 1) {
  try {
    const url = `https://newsapi.org/v2/everything?q=${
      query || "latest"
    }&page=${page}&pageSize=20&apiKey=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch news");
    const data = await response.json();
    return data.articles.filter(
      (article) => article.urlToImage && article.urlToImage.trim() !== ""
    );
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function fetchComments(articleUrl) {
  try {
    const response = await fetch(`/comments/${encodeURIComponent(articleUrl)}`);
    if (!response.ok) throw new Error("Failed to fetch comments");
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function postComment(articleUrl, text) {
  try {
    const response = await fetch("/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleUrl, text }),
    });
    if (!response.ok) throw new Error("Failed to post comment");
  } catch (error) {
    console.error(error);
  }
}

function displayNews(articles, container) {
  articles.forEach((article) => {
    const div = document.createElement("div");
    div.className = "article";
    div.innerHTML = `
            <img src="${article.urlToImage}" alt="${article.title}">
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
    div.textContent = comment.text;
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
  modalBody.innerHTML = `
        <h2>${article.title}</h2>
        <p class="meta">${publishedDate} | Author by ${author}</p>
        <img src="${article.urlToImage}" alt="${article.title}">
        <p>${article.description || "No description available"}</p>
        <p>${article.content || "Full content not available via API."}</p>
        <a href="${article.url}" target="_blank" class="see-more">See More</a>
    `;
  modal.style.display = "block";
  fetchComments(currentArticleUrl).then(displayComments);
  pollingInterval = setInterval(
    () => fetchComments(currentArticleUrl).then(displayComments),
    2000
  );

  saveArticleBtn.textContent = isArticleSaved(article.url)
    ? "Unsave"
    : "Save for Later";
  saveArticleBtn.classList.toggle("saved", isArticleSaved(article.url));
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
  };
}

function loadSavedArticles() {
  const savedArticles = getSavedArticles();
  if (savedArticles.length === 0) {
    noResults.style.display = "block";
  } else {
    displayNews(savedArticles, savedArticlesFeed);
  }
}

postCommentBtn.addEventListener("click", () => {
  const commentText = commentInput.value.trim();
  if (commentText && currentArticleUrl) {
    postComment(currentArticleUrl, commentText);
    commentInput.value = "";
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
  if (articles.length === 0 && page === 1) {
    noResults.style.display = "block";
  } else {
    displayNews(articles, feed);
  }

  loading.style.display = "none";
  isLoading = false;
}

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

fetchApiKey().then((key) => {
  if (key) {
    apiKey = key;
    if (feed) {
      loadNews();
    } else if (savedArticlesFeed) {
      loadSavedArticles();
    }
  } else {
    noResults.textContent = "Error: Could not load API key";
    noResults.style.display = "block";
  }
});
