const form = document.querySelector("#search-form");
const queryInput = document.querySelector("#query");
const methodSelect = document.querySelector("#method");
const apiKeyInput = document.querySelector("#api-key");
const saveKeyButton = document.querySelector("#save-key");
const gallery = document.querySelector("#gallery");
const statusMessage = document.querySelector("#status");
const resultsTitle = document.querySelector("#results-title");
const resultCount = document.querySelector("#result-count");
const loadMoreButton = document.querySelector("#load-more");
const resultsSection = document.querySelector(".results-section");

const KEY_STORAGE_NAME = "fieldnotes-unsplash-access-key";
const RESULTS_PER_PAGE = 12;
let currentQuery = "";
let currentPage = 1;
let totalPages = 0;
let activeRequest = null;

try {
  apiKeyInput.value = localStorage.getItem(KEY_STORAGE_NAME) || "";
} catch {
  // Private browsing settings can disable local storage; the key can still be used for this page view.
}
updateKeyState();

saveKeyButton.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  try {
    if (key) localStorage.setItem(KEY_STORAGE_NAME, key);
    else localStorage.removeItem(KEY_STORAGE_NAME);
    showStatus(key ? "Access Key saved on this device." : "Saved Access Key removed.");
  } catch {
    showStatus("Could not save in this browser. The key will still work until you leave this page.");
  }
  updateKeyState();
});

apiKeyInput.addEventListener("input", updateKeyState);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  currentQuery = queryInput.value.trim();
  currentPage = 1;
  searchPhotos();
});

queryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    form.requestSubmit();
  }
});

loadMoreButton.addEventListener("click", () => {
  currentPage += 1;
  searchPhotos(true);
});

function updateKeyState() {
  const dot = document.querySelector(".key-dot");
  const state = document.querySelector(".summary-state");
  const hasKey = Boolean(apiKeyInput.value.trim());
  dot.style.background = hasKey ? "#647a62" : "#d98757";
  state.textContent = hasKey ? "Key ready" : "Add your key";
}

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function setLoading(isLoading, append = false) {
  resultsSection.setAttribute("aria-busy", String(isLoading));
  loadMoreButton.disabled = isLoading;
  if (isLoading) {
    showStatus(append ? "Finding a few more…" : "Looking for the right frames…");
    if (!append) gallery.replaceChildren();
    loadMoreButton.hidden = true;
  }
}

function buildUrl(query, page) {
  const params = new URLSearchParams({ query, page, per_page: RESULTS_PER_PAGE });
  return `https://api.unsplash.com/search/photos?${params}`;
}

function searchPhotos(append = false) {
  const accessKey = apiKeyInput.value.trim();
  if (!currentQuery) {
    showStatus("Enter a search phrase to get started.", true);
    queryInput.focus();
    return;
  }
  if (!accessKey) {
    showStatus("Add your Unsplash Access Key above to search photos.", true);
    document.querySelector(".key-details").open = true;
    apiKeyInput.focus();
    return;
  }

  if (activeRequest && typeof activeRequest.abort === "function") activeRequest.abort();
  const url = buildUrl(currentQuery, currentPage);
  const method = methodSelect.value;
  setLoading(true, append);
  resultsTitle.textContent = `Searching for “${currentQuery}”`;
  resultCount.textContent = method === "xhr" ? "XMLHTTPREQUEST" : method === "promise" ? "FETCH · PROMISES" : "FETCH · ASYNC/AWAIT";

  if (method === "xhr") {
    activeRequest = searchWithXhr(url, accessKey, append);
  } else if (method === "promise") {
    activeRequest = searchWithPromises(url, accessKey, append);
  } else {
    activeRequest = searchWithAsyncAwait(url, accessKey, append);
  }
}

function handleResults(data, append) {
  if (!data || !Array.isArray(data.results)) throw new Error("The response from Unsplash was not in the expected format.");
  totalPages = data.total_pages || 0;
  resultsTitle.textContent = `${data.total.toLocaleString()} photos for “${currentQuery}”`;
  resultCount.textContent = `${data.total.toLocaleString()} RESULTS`;
  renderPhotos(data.results, append);
  showStatus(data.results.length ? "" : "No photos found. Try a different search phrase.");
  loadMoreButton.hidden = currentPage >= totalPages || data.results.length === 0;
  setLoading(false, append);
}

function renderPhotos(photos, append) {
  if (!append) gallery.replaceChildren();
  const cards = photos.map((photo) => {
    const figure = document.createElement("figure");
    figure.className = "photo-card";

    const image = document.createElement("img");
    image.src = `${photo.urls.small}&auto=format&fit=crop&w=700&q=80`;
    image.alt = photo.alt_description || photo.description || `Photo by ${photo.user.name}`;
    image.loading = "lazy";
    image.decoding = "async";

    const caption = document.createElement("figcaption");
    caption.className = "photo-caption";
    const photographer = document.createElement("span");
    photographer.textContent = photo.user.name;
    const link = document.createElement("a");
    link.href = `${photo.links.html}?utm_source=fieldnotes&utm_medium=referral`;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "View ↗";
    caption.append(photographer, link);
    figure.append(image, caption);
    return figure;
  });
  gallery.append(...cards);
}

function getErrorMessage(error, response) {
  if (response?.status === 401) return "That Access Key was not accepted. Check it and try again.";
  if (response?.status === 403) return "Unsplash denied this request. Check the application’s API limits and key.";
  if (response?.status === 429) return "Unsplash is receiving too many requests. Wait a moment and try again.";
  if (error?.name === "AbortError") return "";
  if (!navigator.onLine) return "You appear to be offline. Check your connection and try again.";
  return error?.message || "Something went wrong while searching. Please try again.";
}

function finishWithError(error, response) {
  setLoading(false);
  const message = getErrorMessage(error, response);
  if (message) showStatus(message, true);
}

// XMLHttpRequest version: listens for ready-state changes and parses the JSON response.
function searchWithXhr(url, accessKey, append) {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", url);
  xhr.setRequestHeader("Authorization", `Client-ID ${accessKey}`);
  xhr.setRequestHeader("Accept-Version", "v1");
  xhr.addEventListener("load", () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      try { handleResults(JSON.parse(xhr.responseText), append); }
      catch (error) { finishWithError(error); }
    } else finishWithError(new Error("Request failed"), xhr);
  });
  xhr.addEventListener("error", () => finishWithError(new Error("Network request failed")));
  xhr.addEventListener("abort", () => setLoading(false));
  xhr.send();
  return xhr;
}

// Fetch with Promises version: explicitly chains response parsing and result handling.
function searchWithPromises(url, accessKey, append) {
  const controller = new AbortController();
  fetch(url, { headers: { Authorization: `Client-ID ${accessKey}`, "Accept-Version": "v1" }, signal: controller.signal })
    .then((response) => {
      if (!response.ok) throw Object.assign(new Error(`Request failed (${response.status})`), { response });
      return response.json();
    })
    .then((data) => handleResults(data, append))
    .catch((error) => finishWithError(error, error.response));
  return controller;
}

// Fetch with async/await version: awaits the response, JSON body, then renders results.
function searchWithAsyncAwait(url, accessKey, append) {
  const controller = new AbortController();
  const run = async () => {
    try {
      const response = await fetch(url, { headers: { Authorization: `Client-ID ${accessKey}`, "Accept-Version": "v1" }, signal: controller.signal });
      if (!response.ok) throw Object.assign(new Error(`Request failed (${response.status})`), { response });
      const data = await response.json();
      handleResults(data, append);
    } catch (error) {
      finishWithError(error, error.response);
    }
  };
  run();
  return controller;
}
