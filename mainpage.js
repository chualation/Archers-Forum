(function () {
  const name = localStorage.getItem("af_user");
  const email = localStorage.getItem("af_user_email");

  if (!name || !email) {
    window.location.href = "login.html";
    return;
  }

  // smooth fade-in on page load
  document.body.classList.add("is-ready");

  function navigateWithFade(href) {
    document.body.classList.add("is-leaving");
    window.setTimeout(() => {
      window.location.href = href;
    }, 260);
  }

  // smooth page transitions for profile link
  const profileLink = document.getElementById("profileLink");
  if (profileLink) {
    profileLink.addEventListener("click", (e) => {
      const href = profileLink.getAttribute("href");
      if (!href) return;
      e.preventDefault();
      navigateWithFade(href);
    });
  }

  // Set name in header
  const nameEl = document.querySelector(".user-name");
  if (nameEl) nameEl.textContent = name;

  // Logout
  const logoutBtn = document.querySelector(".btn-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("af_user");
      localStorage.removeItem("af_user_email");
      localStorage.removeItem("af_user_password");
      navigateWithFade("login.html");
    });
  }

  // Storage helpers
  const POSTS_KEY = AF_STORAGE.KEYS.POSTS;
  const VOTES_KEY = AF_STORAGE.KEYS.VOTES;

  function loadJSON(key, fallback) {
    return AF_STORAGE.load(key, fallback);
  }

  function saveJSON(key, value) {
    AF_STORAGE.save(key, value);
  }

  // utilities
  function makeId(prefix) {
    return (
      (prefix || "id") +
      "_" +
      Date.now() +
      "_" +
      Math.random().toString(16).slice(2)
    );
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function normalizeTags(input) {
    if (!input) return [];
    return input
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.replace(/\s+/g, " "))
      .slice(0, 8);
  }

  // confirmation modals
  function showConfirmModal(
    { title, message, confirmText, cancelText, danger },
    onConfirm,
  ) {
    const existing = document.getElementById("afConfirmOverlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "afConfirmOverlay";
    overlay.className = "af-confirm-overlay";

    overlay.innerHTML = `
      <div class="af-confirm-card" role="dialog" aria-modal="true" aria-labelledby="afConfirmTitle">
        <div class="af-confirm-header">
          <h3 id="afConfirmTitle" class="af-confirm-title">${escapeHtml(
            title || "Confirm",
          )}</h3>
          <button class="af-confirm-x" type="button" aria-label="Close">✕</button>
        </div>

        <p class="af-confirm-message">${escapeHtml(message || "")}</p>

        <div class="af-confirm-actions">
          <button class="af-confirm-btn" type="button" data-af-action="cancel">${escapeHtml(
            cancelText || "Cancel",
          )}</button>
          <button
            class="af-confirm-btn ${
              danger ? "af-confirm-btn--danger" : "af-confirm-btn--primary"
            }"
            type="button"
            data-af-action="confirm"
          >
            ${escapeHtml(confirmText || "Confirm")}
          </button>
        </div>
      </div>
    `;

    function close() {
      overlay.classList.remove("open");
      window.setTimeout(() => overlay.remove(), 140);
      document.removeEventListener("keydown", onKey);
    }

    function onKey(e) {
      if (e.key === "Escape") close();
    }

    document.addEventListener("keydown", onKey);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    overlay.querySelector(".af-confirm-x").addEventListener("click", close);
    overlay
      .querySelector('[data-af-action="cancel"]')
      .addEventListener("click", close);

    overlay
      .querySelector('[data-af-action="confirm"]')
      .addEventListener("click", () => {
        close();
        if (typeof onConfirm === "function") onConfirm();
      });

    document.body.appendChild(overlay);

    window.setTimeout(() => overlay.classList.add("open"), 0);

    const confirmBtn = overlay.querySelector('[data-af-action="confirm"]');
    if (confirmBtn) confirmBtn.focus();
  }

  // data state
  let posts = loadJSON(POSTS_KEY, []);
  let votesByUser = loadJSON(VOTES_KEY, {});
  votesByUser[email] = votesByUser[email] || {};

  // Demo posts
  if (posts.length === 0) {
    posts = [
      {
        id: makeId("post"),
        title: "What’s the best GE course to take?",
        category: "Academics",
        tags: ["frosh", "ge", "enlistment"],
        body: "I’m planning my enlistment next term. Any GE courses that are interesting but not too heavy?",
        authorName: "ArcherAdmin",
        authorEmail: "admin@archersforum.dev",
        createdAt: Date.now() - 1000 * 60 * 60 * 6,
        score: 5,
        comments: [],
      },
      {
        id: makeId("post"),
        title: "Thoughts on CCS orgs to join?",
        category: "Organizations",
        tags: ["orgs", "ccs", "freshman"],
        body: "There are so many CCS orgs 😭 Which ones are beginner-friendly and active?",
        authorName: "ArcherAdmin",
        authorEmail: "admin@archersforum.dev",
        createdAt: Date.now() - 1000 * 60 * 60 * 3,
        score: 8,
        comments: [],
      },
      {
        id: makeId("post"),
        title: "Selling used calculus textbook",
        category: "Buy & Sell",
        tags: ["books", "for-sale"],
        body: "Selling my calculus textbook in good condition. DM if interested!",
        authorName: "ArcherAdmin",
        authorEmail: "admin@archersforum.dev",
        createdAt: Date.now() - 1000 * 60 * 60,
        score: 2,
        comments: [],
      },
    ];
    saveJSON(POSTS_KEY, posts);
  }

  // UI state
  let activeCategory = "All";
  let activeTag = null;
  let searchQuery = "";
  let sortMode = "newest";
  let activePostId = null;

  // Only animate feed on list changes
  let shouldAnimateFeed = true;

  // DOM elements
  const categoryMenu = document.getElementById("categoryMenu");
  const feed = document.getElementById("postsFeed");
  const feedEmpty = document.getElementById("feedEmpty");
  const feedTitle = document.getElementById("feedTitle");
  const searchInput = document.getElementById("searchInput");

  const openComposerBtn = document.getElementById("openComposerBtn");
  const createFirstBtn = document.getElementById("createFirstBtn");
  const quickPostTitle = document.getElementById("quickPostTitle");

  // Composer modal
  const composerOverlay = document.getElementById("composerOverlay");
  const closeComposerBtn = document.getElementById("closeComposerBtn");
  const cancelComposerBtn = document.getElementById("cancelComposerBtn");
  const createPostForm = document.getElementById("createPostForm");

  const postTitle = document.getElementById("postTitle");
  const postCategory = document.getElementById("postCategory");
  const postTags = document.getElementById("postTags");
  const postBody = document.getElementById("postBody");
  const titleCount = document.getElementById("titleCount");

  // Tags
  const allTagsChips = document.getElementById("allTagsChips");
  const trendingTags = document.getElementById("trendingTags");
  const noTagsText = document.getElementById("noTagsText");
  const noTrendingText = document.getElementById("noTrendingText");

  // Detail modal
  const detailOverlay = document.getElementById("detailOverlay");
  const closeDetailBtn = document.getElementById("closeDetailBtn");
  const detailContent = document.getElementById("detailContent");
  const commentForm = document.getElementById("commentForm");
  const commentText = document.getElementById("commentText");
  const commentsList = document.getElementById("commentsList");

  // Sort dropdown (FIXED)
  const sortDropdown = document.getElementById("sortDropdown");
  const sortBtn = document.getElementById("sortBtn");
  const sortMenu = document.getElementById("sortMenu");
  const sortLabel = document.getElementById("sortLabel");

  // Modal open/close helpers
  function openOverlay(overlayEl) {
    overlayEl.classList.add("open");
    overlayEl.setAttribute("aria-hidden", "false");
  }

  function closeOverlay(overlayEl) {
    overlayEl.classList.remove("open");
    overlayEl.setAttribute("aria-hidden", "true");
  }

  function openComposer(prefillTitle) {
    createPostForm.reset();
    titleCount.textContent = "0";

    if (prefillTitle) {
      postTitle.value = prefillTitle;
      titleCount.textContent = String(prefillTitle.length);
    }

    openOverlay(composerOverlay);
    postTitle.focus();
  }

  function closeComposer() {
    closeOverlay(composerOverlay);
  }

  function openDetail(postId) {
    activePostId = postId;
    renderDetail();
    openOverlay(detailOverlay);
  }

  function closeDetail() {
    activePostId = null;
    closeOverlay(detailOverlay);
  }

  // filtering & sorting
  function applyFilters(list) {
    let out = list.slice();

    if (activeCategory && activeCategory !== "All") {
      out = out.filter((p) => p.category === activeCategory);
    }

    if (activeTag) {
      out = out.filter((p) => (p.tags || []).includes(activeTag));
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      out = out.filter((p) => {
        const hay = [
          p.title,
          p.body,
          p.category,
          (p.tags || []).join(" "),
          p.authorName,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    if (sortMode === "newest") out.sort((a, b) => b.createdAt - a.createdAt);
    if (sortMode === "oldest") out.sort((a, b) => a.createdAt - b.createdAt);
    if (sortMode === "top") out.sort((a, b) => (b.score || 0) - (a.score || 0));

    return out;
  }

  function updateFeedTitle() {
    let title = "All Posts";
    if (activeCategory !== "All") title = activeCategory;
    if (activeTag) title += ` · #${activeTag}`;
    if (feedTitle) feedTitle.textContent = title;
  }

  // voting
  function getUserVote(postId) {
    return (votesByUser[email] && votesByUser[email][postId]) || null;
  }

  function setUserVote(postId, voteValue) {
    votesByUser[email][postId] = voteValue; // "up"|"down"|null
    saveJSON(VOTES_KEY, votesByUser);
  }

  function vote(postId, direction) {
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx < 0) return;

    // no feed animation on vote
    shouldAnimateFeed = false;

    const current = getUserVote(postId);
    let next = direction;
    if (current === direction) next = null;

    let delta = 0;
    if (!current && next === "up") delta = +1;
    if (!current && next === "down") delta = -1;
    if (current === "up" && !next) delta = -1;
    if (current === "down" && !next) delta = +1;
    if (current === "up" && next === "down") delta = -2;
    if (current === "down" && next === "up") delta = +2;

    posts[idx].score = (posts[idx].score || 0) + delta;

    setUserVote(postId, next);
    saveJSON(POSTS_KEY, posts);

    render();
    if (activePostId === postId) renderDetail();
  }

  // categories / tags
  function setActiveCategory(cat) {
    activeCategory = cat;
    activeTag = null;
    shouldAnimateFeed = true;

    if (categoryMenu) {
      categoryMenu.querySelectorAll("li").forEach((li) => {
        li.classList.toggle("active", li.dataset.category === cat);
      });
    }

    render();
  }

  function setActiveTag(tag) {
    activeTag = activeTag === tag ? null : tag;
    shouldAnimateFeed = true;
    render();
  }

  function isOwner(post) {
    return post && post.authorEmail === email;
  }

  /// comments
  function isCommentOwner(c) {
    // fallback for older comments
    return (
      (c && c.authorEmail === email) ||
      (!c.authorEmail && c.authorName === name)
    );
  }

  function ensureRepliesArray(c) {
    if (!c.replies) c.replies = [];
  }

  function findCommentById(commentList, id) {
    for (let i = 0; i < (commentList || []).length; i++) {
      const c = commentList[i];
      if (c.id === id) return c;
      const found = findCommentById(c.replies || [], id);
      if (found) return found;
    }
    return null;
  }

  function deleteCommentById(commentList, id) {
    if (!commentList) return false;

    for (let i = 0; i < commentList.length; i++) {
      const c = commentList[i];
      if (c.id === id) {
        commentList.splice(i, 1);
        return true;
      }
      const deletedInReplies = deleteCommentById(c.replies || [], id);
      if (deletedInReplies) return true;
    }
    return false;
  }

  function addReplyToComment(post, parentCommentId, replyObj) {
    if (!post) return false;
    post.comments = post.comments || [];
    const parent = findCommentById(post.comments, parentCommentId);
    if (!parent) return false;

    ensureRepliesArray(parent);
    parent.replies.push(replyObj);
    return true;
  }

  // tags rendering
  function renderTagAreas(allPosts) {
    if (!allTagsChips || !trendingTags || !noTagsText || !noTrendingText)
      return;

    const usageCounts = new Map();
    const upvoteCountsByPost = new Map();

    Object.keys(votesByUser || {}).forEach((userEmail) => {
      const perUser = votesByUser[userEmail];
      if (!perUser) return;

      Object.keys(perUser).forEach((postId) => {
        if (perUser[postId] === "up") {
          upvoteCountsByPost.set(
            postId,
            (upvoteCountsByPost.get(postId) || 0) + 1,
          );
        }
      });
    });

    const popularityByTag = new Map();

    allPosts.forEach((p) => {
      const tags = p.tags || [];
      const postUpvotes = upvoteCountsByPost.get(p.id) || 0;

      tags.forEach((t) => {
        usageCounts.set(t, (usageCounts.get(t) || 0) + 1);
        popularityByTag.set(t, (popularityByTag.get(t) || 0) + postUpvotes);
      });
    });

    // Trending tags (by upvote count, then usage, then alphabetically)
    const tagsSorted = Array.from(usageCounts.entries())
      .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0])))
      .map(([tag]) => tag);

    allTagsChips.innerHTML = "";
    if (tagsSorted.length === 0) {
      noTagsText.style.display = "block";
      allTagsChips.appendChild(noTagsText);
    } else {
      noTagsText.style.display = "none";
      tagsSorted.slice(0, 12).forEach((t) => {
        const btn = document.createElement("button");
        btn.className = "chip tag-chip";
        btn.type = "button";
        btn.dataset.tag = t;
        btn.textContent = "#" + t;
        allTagsChips.appendChild(btn);
      });
    }

    const trendingSorted = Array.from(usageCounts.keys())
      .map((tag) => ({
        tag,
        popularity: popularityByTag.get(tag) || 0,
        usage: usageCounts.get(tag) || 0,
      }))
      .sort((a, b) => {
        if (b.popularity !== a.popularity) return b.popularity - a.popularity;
        if (b.usage !== a.usage) return b.usage - a.usage;
        return a.tag.localeCompare(b.tag);
      })
      .map((x) => x.tag);

    trendingTags.innerHTML = "";
    if (trendingSorted.length === 0) {
      noTrendingText.style.display = "block";
      trendingTags.appendChild(noTrendingText);
    } else {
      noTrendingText.style.display = "none";
      trendingSorted.slice(0, 6).forEach((t) => {
        const btn = document.createElement("button");
        btn.className = "chip tag-chip";
        btn.type = "button";
        btn.dataset.tag = t;
        btn.textContent = "#" + t;
        trendingTags.appendChild(btn);
      });
    }
  }

  // post rendering
  function renderPostCard(p) {
    const previewLen = 220;
    const preview =
      p.body.length > previewLen ? p.body.slice(0, previewLen) + "…" : p.body;

    const userVote = getUserVote(p.id);
    const upActive = userVote === "up" ? "active" : "";
    const downActive = userVote === "down" ? "active" : "";

    const tags = p.tags || [];
    const tagsHtml = tags.length
      ? `<div class="rf-tags">${tags
          .map(
            (t) =>
              `<button class="rf-tag tag-chip" type="button" data-tag="${escapeHtml(
                t,
              )}">#${escapeHtml(t)}</button>`,
          )
          .join("")}</div>`
      : "";

    return `
      <article class="rf-post" data-id="${escapeHtml(p.id)}">
        <aside class="rf-vote">
          <button class="rf-vote-btn ${upActive}" type="button" data-action="upvote" aria-label="Upvote">▲</button>
          <div class="rf-score" title="Score">${p.score || 0}</div>
          <button class="rf-vote-btn ${downActive}" type="button" data-action="downvote" aria-label="Downvote">▼</button>
        </aside>

        <div class="rf-main">
          <div class="rf-meta">
            <span class="rf-pill">${escapeHtml(p.category)}</span>
            <span class="rf-meta-sep">•</span>
            <span class="rf-author">${escapeHtml(p.authorName)}</span>
            <span class="rf-meta-sep">•</span>
            <time class="rf-time">${escapeHtml(formatDate(p.createdAt))}</time>
          </div>

          <h4 class="rf-title">${escapeHtml(p.title)}</h4>
          <p class="rf-body">${escapeHtml(preview)}</p>

          ${tagsHtml}

          <div class="rf-actions">
            <button class="rf-action" type="button" data-action="view">View</button>
            ${
              isOwner(p)
                ? `<button class="rf-action rf-danger" type="button" data-action="delete">Delete</button>`
                : ``
            }
          </div>
        </div>
      </article>
    `;
  }

  function animatePostsIn() {
    const cards = feed ? feed.querySelectorAll(".rf-post") : [];
    cards.forEach((card, i) => {
      card.classList.remove("post-in");
      window.setTimeout(
        () => {
          card.classList.add("post-in");
        },
        40 + i * 30,
      );
    });
  }

  function handleDelete(postId) {
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx < 0) return;
    if (!isOwner(posts[idx])) return;
    if (!confirm("Delete this post?")) return;

    posts.splice(idx, 1);
    saveJSON(POSTS_KEY, posts);

    Object.keys(votesByUser).forEach((userEmail) => {
      if (
        votesByUser[userEmail] &&
        votesByUser[userEmail][postId] !== undefined
      ) {
        delete votesByUser[userEmail][postId];
      }
    });
    saveJSON(VOTES_KEY, votesByUser);

    if (activePostId === postId) closeDetail();
    shouldAnimateFeed = true;
    render();
  }

  function render() {
    updateFeedTitle();
    const filtered = applyFilters(posts);

    if (!feed || !feedEmpty) return;

    if (filtered.length === 0) {
      feedEmpty.style.display = "block";
      feed.innerHTML = "";
    } else {
      feedEmpty.style.display = "none";
      feed.innerHTML = filtered.map(renderPostCard).join("");
      if (shouldAnimateFeed) {
        animatePostsIn();
        shouldAnimateFeed = false;
      }
    }

    renderTagAreas(posts);
  }

  // detail rendering
  function getPostById(id) {
    return posts.find((p) => p.id === id) || null;
  }

  function renderComments() {
    const p = getPostById(activePostId);
    if (!p || !commentsList) return;

    p.comments = p.comments || [];
    commentsList.innerHTML = "";

    if (p.comments.length === 0) {
      commentsList.innerHTML = `<p class="placeholder-text">No comments yet.</p>`;
      return;
    }

    function renderCommentNode(c, depth) {
      ensureRepliesArray(c);

      const canDelete = isCommentOwner(c);
      const indentClass = depth > 0 ? "comment comment--reply" : "comment";

      const repliesHtml = (c.replies || [])
        .map((r) => renderCommentNode(r, depth + 1))
        .join("");

      return `
        <div class="${indentClass}" data-comment-id="${escapeHtml(c.id)}">
          <div class="comment-meta">
            <span class="comment-author">${escapeHtml(c.authorName)}</span>
            <span>${escapeHtml(formatDate(c.createdAt))}</span>
          </div>

          <div class="comment-body">${escapeHtml(c.body)}</div>

          <div class="comment-actions-row">
            <button class="comment-btn" type="button" data-action="reply">Reply</button>
            ${
              canDelete
                ? `<button class="comment-btn comment-btn--danger" type="button" data-action="delete-comment">Delete</button>`
                : ``
            }
          </div>

          <div class="reply-form" hidden>
            <textarea class="reply-text" rows="2" placeholder="Write a reply..."></textarea>
            <div class="reply-actions">
              <button class="comment-btn" type="button" data-action="submit-reply">Reply</button>
              <button class="comment-btn" type="button" data-action="cancel-reply">Cancel</button>
            </div>
          </div>

          ${repliesHtml ? `<div class="comment-replies">${repliesHtml}</div>` : ``}
        </div>
      `;
    }

    commentsList.innerHTML = p.comments
      .map((c) => renderCommentNode(c, 0))
      .join("");
  }

  function renderDetail() {
    const p = getPostById(activePostId);
    if (!detailContent) return;

    if (!p) {
      detailContent.innerHTML = `<p class="placeholder-text">Post not found.</p>`;
      if (commentsList) commentsList.innerHTML = "";
      return;
    }

    const userVote = getUserVote(p.id);
    const upActive = userVote === "up" ? "active" : "";
    const downActive = userVote === "down" ? "active" : "";

    const tags = p.tags || [];
    const tagsHtml = tags.length
      ? `<div class="rf-tags">
          ${tags
            .map(
              (t) =>
                `<button class="rf-tag tag-chip" type="button" data-tag="${escapeHtml(
                  t,
                )}">#${escapeHtml(t)}</button>`,
            )
            .join("")}
        </div>`
      : "";

    detailContent.innerHTML = `
      <article class="rf-post rf-post--detail" data-id="${escapeHtml(p.id)}">
        <aside class="rf-vote">
          <button class="rf-vote-btn ${upActive}" type="button" id="detailUpBtn" aria-label="Upvote">▲</button>
          <div class="rf-score" title="Score">${p.score || 0}</div>
          <button class="rf-vote-btn ${downActive}" type="button" id="detailDownBtn" aria-label="Downvote">▼</button>
        </aside>

        <div class="rf-main">
          <div class="rf-meta">
            <span class="rf-pill">${escapeHtml(p.category)}</span>
            <span class="rf-meta-sep">•</span>
            <span class="rf-author">${escapeHtml(p.authorName)}</span>
            <span class="rf-meta-sep">•</span>
            <time class="rf-time">${escapeHtml(formatDate(p.createdAt))}</time>
          </div>

          <h4 class="rf-title">${escapeHtml(p.title)}</h4>
          <div class="rf-body rf-body--full">${escapeHtml(p.body)}</div>

          ${tagsHtml}
        </div>
      </article>
    `;

    const detailUpBtn = document.getElementById("detailUpBtn");
    const detailDownBtn = document.getElementById("detailDownBtn");
    if (detailUpBtn)
      detailUpBtn.addEventListener("click", () => vote(p.id, "up"));
    if (detailDownBtn)
      detailDownBtn.addEventListener("click", () => vote(p.id, "down"));

    detailContent.querySelectorAll(".tag-chip").forEach((btn) => {
      btn.addEventListener("click", () =>
        setActiveTag(btn.dataset.tag || null),
      );
    });

    renderComments();
  }

  // create post
  function createPostFromForm() {
    const title = postTitle ? postTitle.value.trim() : "";
    const category = postCategory ? postCategory.value : "General";
    const tags = normalizeTags(postTags ? postTags.value : "");
    const body = postBody ? postBody.value.trim() : "";
    if (!title || !body) return;

    const post = {
      id: makeId("post"),
      title,
      category,
      tags,
      body,
      authorName: name,
      authorEmail: email,
      createdAt: Date.now(),
      score: 0,
      comments: [],
    };

    posts.unshift(post);
    saveJSON(POSTS_KEY, posts);
    shouldAnimateFeed = true;

    closeComposer();
    render();
  }

  // event listeners
  if (categoryMenu) {
    categoryMenu.querySelectorAll("li").forEach((li) => {
      li.addEventListener("click", () =>
        setActiveCategory(li.dataset.category),
      );
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value;
      shouldAnimateFeed = true;
      render();
    });
  }

  // Sort dropdown 
  function closeSortMenu() {
    if (!sortDropdown || !sortBtn) return;
    sortDropdown.classList.remove("open");
    sortBtn.setAttribute("aria-expanded", "false");
  }

  if (sortBtn && sortMenu && sortDropdown) {
    sortBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = sortDropdown.classList.toggle("open");
      sortBtn.setAttribute("aria-expanded", String(isOpen));
    });

    sortMenu.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    document.addEventListener("click", () => closeSortMenu());

    sortMenu.querySelectorAll(".dropdown-item").forEach((item) => {
      item.addEventListener("click", () => {
        sortMenu
          .querySelectorAll(".dropdown-item")
          .forEach((i) => i.classList.remove("selected"));
        item.classList.add("selected");

        sortMode = item.dataset.value;
        if (sortLabel) sortLabel.textContent = item.textContent;

        closeSortMenu();
        shouldAnimateFeed = true;
        render();
      });
    });
  }

  // Composer open/close
  if (openComposerBtn) {
    openComposerBtn.addEventListener("click", () =>
      openComposer(quickPostTitle ? quickPostTitle.value.trim() : ""),
    );
  }
  if (createFirstBtn)
    createFirstBtn.addEventListener("click", () => openComposer(""));

  if (closeComposerBtn)
    closeComposerBtn.addEventListener("click", closeComposer);
  if (cancelComposerBtn)
    cancelComposerBtn.addEventListener("click", closeComposer);
  if (composerOverlay) {
    composerOverlay.addEventListener("click", (e) => {
      if (e.target === composerOverlay) closeComposer();
    });
  }

  if (createPostForm) {
    createPostForm.addEventListener("submit", (e) => {
      e.preventDefault();
      createPostFromForm();
    });
  }

  if (postTitle && titleCount) {
    postTitle.addEventListener("input", () => {
      titleCount.textContent = String(postTitle.value.length);
    });
  }

  // Detail close
  if (closeDetailBtn) closeDetailBtn.addEventListener("click", closeDetail);
  if (detailOverlay) {
    detailOverlay.addEventListener("click", (e) => {
      if (e.target === detailOverlay) closeDetail();
    });
  }

  // Comment submit
  if (commentForm) {
    commentForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!commentText) return;

      const text = commentText.value.trim();
      if (!text) return;

      const p = getPostById(activePostId);
      if (!p) return;

      shouldAnimateFeed = false;

      p.comments = p.comments || [];
      p.comments.push({
        id: makeId("c"),
        authorName: name,
        authorEmail: email,
        body: text,
        createdAt: Date.now(),
        replies: [],
      });

      saveJSON(POSTS_KEY, posts);
      commentText.value = "";
      renderComments();
      render();
    });
  }

  // comments actions
  if (commentsList) {
    commentsList.addEventListener("click", (e) => {
      const actionEl = e.target.closest("[data-action]");
      const commentEl = e.target.closest("[data-comment-id]");
      if (!actionEl || !commentEl) return;

      e.preventDefault();
      e.stopPropagation();

      const action = actionEl.getAttribute("data-action");
      const commentId = commentEl.getAttribute("data-comment-id");

      const p = getPostById(activePostId);
      if (!p) return;

      shouldAnimateFeed = false;

      if (action === "reply") {
        const form = commentEl.querySelector(".reply-form");
        if (!form) return;

        if (form.hasAttribute("hidden")) {
          form.removeAttribute("hidden");
          const ta = form.querySelector(".reply-text");
          if (ta) ta.focus();
        } else {
          form.setAttribute("hidden", "");
        }
        return;
      }

      if (action === "cancel-reply") {
        const form = commentEl.querySelector(".reply-form");
        if (!form) return;

        const ta = form.querySelector(".reply-text");
        if (ta) ta.value = "";
        form.setAttribute("hidden", "");
        return;
      }

      if (action === "submit-reply") {
        const form = commentEl.querySelector(".reply-form");
        if (!form) return;

        const ta = form.querySelector(".reply-text");
        const text = (ta ? ta.value : "").trim();
        if (!text) return;

        const replyObj = {
          id: makeId("r"),
          authorName: name,
          authorEmail: email,
          body: text,
          createdAt: Date.now(),
          replies: [],
        };

        const ok = addReplyToComment(p, commentId, replyObj);
        if (!ok) return;

        saveJSON(POSTS_KEY, posts);

        if (ta) ta.value = "";
        form.setAttribute("hidden", "");

        renderComments();
        render();
        return;
      }

      if (action === "delete-comment") {
        const target = findCommentById(p.comments || [], commentId);
        if (!target || !isCommentOwner(target)) return;

        showConfirmModal(
          {
            title: "Delete comment?",
            message:
              "This will permanently remove your comment and its replies.",
            confirmText: "Delete",
            cancelText: "Cancel",
            danger: true,
          },
          () => {
            const deleted = deleteCommentById(p.comments || [], commentId);
            if (!deleted) return;

            saveJSON(POSTS_KEY, posts);
            renderComments();
            render();
          },
        );

        return;
      }
    });
  }

  // Feed actions 
  if (feed) {
    feed.addEventListener("click", (e) => {
      const actionBtn = e.target.closest("[data-action]");
      const tagBtn = e.target.closest("[data-tag]");
      const card = e.target.closest(".rf-post");

      if (tagBtn && tagBtn.dataset.tag) {
        setActiveTag(tagBtn.dataset.tag);
        return;
      }

      if (!actionBtn || !card) return;

      const postId = card.getAttribute("data-id");
      const action = actionBtn.getAttribute("data-action");

      if (action === "upvote") vote(postId, "up");
      if (action === "downvote") vote(postId, "down");
      if (action === "view") openDetail(postId);
      if (action === "delete") handleDelete(postId);
    });
  }

  // Sidebar tags 
  document.addEventListener("click", (e) => {
    const chip = e.target.closest(".tag-chip");
    if (!chip || !chip.dataset.tag) return;

    const inTagAreas =
      chip.closest("#allTagsChips") ||
      chip.closest("#trendingTags") ||
      chip.closest("#detailContent");

    if (!inTagAreas) return;
    setActiveTag(chip.dataset.tag);
  });

  // Initial
  render();
})();