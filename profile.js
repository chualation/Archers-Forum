(function () {
  const savedTheme = localStorage.getItem("af_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  const name = localStorage.getItem("af_user");
  const email = localStorage.getItem("af_user_email");

  if (!name || !email) {
    window.location.href = "login.html";
    return;
  }

  document.body.classList.add("is-ready");

  const POSTS_KEY = AF_STORAGE.KEYS.POSTS;

  const PROFILE_KEYS = {
    COVER: "af_profile_cover",
    AVATAR: "af_profile_avatar",
  };

  const DEFAULTS = {
    COVER: "assets/default_banner.png", 
    AVATAR: "assets/default_pfp.png",  
  };

  function navigateWithFade(href) {
    document.body.classList.add("is-leaving");
    window.setTimeout(() => {
      window.location.href = href;
    }, 260);
  }

  function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }

  function setSrc(id, value) {
    const el = document.getElementById(id);
    if (el) el.src = value;
  }

  function loadJSON(key, fallback) {
    if (window.AF_STORAGE && typeof AF_STORAGE.load === "function") {
      return AF_STORAGE.load(key, fallback);
    }
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function getNameParts(fullName) {
    const raw = String(fullName || "").trim();
    if (!raw) return { first: "", last: "" };
    const parts = raw.split(/\s+/);
    if (parts.length === 1) return { first: parts[0], last: "" };
    return { first: parts[0], last: parts.slice(1).join(" ") };
  }

  function isDefaultSrc(src, defaultPath) {
    return String(src || "").includes(defaultPath);
  }

  function hydrateProfileHeader() {
    setText(".profile-display-name", localStorage.getItem("af_user") || name);
    setText("#profileEmail", email);

    // Load saved images or use defaults
    const savedCover = localStorage.getItem(PROFILE_KEYS.COVER);
    const savedAvatar = localStorage.getItem(PROFILE_KEYS.AVATAR);
    
    setSrc("coverImage", savedCover || DEFAULTS.COVER);
    setSrc("profileAvatar", savedAvatar || DEFAULTS.AVATAR);
  }

  function computeStats() {
    const posts = loadJSON(POSTS_KEY, []);
    const mine = posts.filter((p) => p && p.authorEmail === email);

    // Count user's replies across all posts
    let totalReplies = 0;
    posts.forEach((post) => {
      if (post.comments) {
        post.comments.forEach((comment) => {
          if (comment.authorEmail === email) {
            totalReplies++;
          }
          if (comment.replies) {
            comment.replies.forEach((reply) => {
              if (reply.authorEmail === email) {
                totalReplies++;
              }
            });
          }
        });
      }
    });

    const totalPosts = mine.length;
    const threadsCreated = mine.length;

    let viewsProxy = 0;
    mine.forEach((p) => {
      viewsProxy += (p.comments || []).length;
    });

    const statEls = document.querySelectorAll(".profile-stat-number");
    if (statEls[0]) statEls[0].textContent = String(totalPosts);
    if (statEls[1]) statEls[1].textContent = String(threadsCreated);
    if (statEls[2]) statEls[2].textContent = String(viewsProxy);

    const allTabs = document.querySelectorAll(".profile-tabs .profile-tab");
    if (allTabs[0]) allTabs[0].textContent = `My Threads (${threadsCreated})`;
    if (allTabs[1]) allTabs[1].textContent = `My Replies (${totalReplies})`;
  }

  function setupCoverParallax() {
    const coverImg = document.getElementById("coverImage");
    if (!coverImg) return;

    let latestY = 0;
    let ticking = false;

    function onScroll() {
      latestY = window.scrollY || 0;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          const offset = Math.min(latestY * 0.18, 70);
          coverImg.style.transform = `translateY(${offset}px) scale(1.05)`;
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
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

  function renderUserThreads() {
    const threadsContainer = document.getElementById("threadsContent");
    if (!threadsContainer) return;

    const posts = loadJSON(POSTS_KEY, []);
    const userThreads = posts.filter((p) => p && p.authorEmail === email);

    if (userThreads.length === 0) {
      threadsContainer.innerHTML = `
        <div class="empty-state">
          <p>No threads created yet.</p>
        </div>
      `;
      return;
    }

    // Sort by creation date (newest first)
    userThreads.sort((a, b) => b.createdAt - a.createdAt);

    const threadsHTML = userThreads.map(thread => `
      <div class="thread-item clickable" data-post-id="${thread.id}" onclick="navigateToPost('${thread.id}')">
        <div class="thread-header">
          <h3 class="thread-title">${escapeHtml(thread.title)} <span class="click-indicator">→</span></h3>
          <span class="thread-category">${escapeHtml(thread.category)}</span>
        </div>
        <div class="thread-meta">
          <span class="thread-date">${formatDate(thread.createdAt)}</span>
          <span class="thread-stats">${(thread.comments || []).length} comments</span>
        </div>
        <div class="thread-body">
          ${escapeHtml(thread.body.substring(0, 150))}${thread.body.length > 150 ? '...' : ''}
        </div>
        ${thread.tags && thread.tags.length > 0 ? `
          <div class="thread-tags">
            ${thread.tags.map(tag => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');

    threadsContainer.innerHTML = threadsHTML;
  }

  function renderUserReplies() {
    const repliesContainer = document.getElementById("repliesContent");
    if (!repliesContainer) return;

    const posts = loadJSON(POSTS_KEY, []);
    const userReplies = [];

    // Find all user's comments and replies
    posts.forEach((post) => {
      if (post.comments) {
        post.comments.forEach((comment) => {
          if (comment.authorEmail === email) {
            userReplies.push({
              ...comment,
              postTitle: post.title,
              postId: post.id,
              isTopLevel: true
            });
          }
          // Check nested replies
          if (comment.replies) {
            comment.replies.forEach((reply) => {
              if (reply.authorEmail === email) {
                userReplies.push({
                  ...reply,
                  postTitle: post.title,
                  postId: post.id,
                  parentComment: comment.body.substring(0, 50) + '...',
                  isTopLevel: false
                });
              }
            });
          }
        });
      }
    });

    if (userReplies.length === 0) {
      repliesContainer.innerHTML = `
        <div class="empty-state">
          <p>No replies posted yet.</p>
        </div>
      `;
      return;
    }

    // Sort by creation date (newest first)
    userReplies.sort((a, b) => b.createdAt - a.createdAt);

    const repliesHTML = userReplies.map(reply => `
      <div class="reply-item clickable" data-post-id="${reply.postId}" onclick="navigateToPost('${reply.postId}')">
        <div class="reply-header">
          <span class="reply-type">${reply.isTopLevel ? 'Comment on' : 'Reply to'}</span>
          <span class="reply-thread">${escapeHtml(reply.postTitle)} <span class="click-indicator">→</span></span>
        </div>
        ${!reply.isTopLevel ? `
          <div class="reply-context">
            <small>In response to: "${escapeHtml(reply.parentComment)}"</small>
          </div>
        ` : ''}
        <div class="reply-body">
          ${escapeHtml(reply.body)}
        </div>
        <div class="reply-meta">
          <span class="reply-date">${formatDate(reply.createdAt)}</span>
        </div>
      </div>
    `).join('');

    repliesContainer.innerHTML = repliesHTML;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function updateEditMediaUI() {
    const coverPreview = document.getElementById("editCoverPreview");
    const avatarPreview = document.getElementById("previewImg");

    const bannerAddBtn = document.getElementById("bannerAddBtn");
    const bannerHas = document.getElementById("bannerHasControls");

    const avatarAddBtn = document.getElementById("avatarAddBtn");
    const avatarHas = document.getElementById("avatarHasControls");

    const hasCover = coverPreview
      ? !isDefaultSrc(coverPreview.src, DEFAULTS.COVER)
      : false;

    const hasAvatar = avatarPreview
      ? !isDefaultSrc(avatarPreview.src, DEFAULTS.AVATAR)
      : false;

    if (bannerAddBtn && bannerHas) {
      bannerAddBtn.style.display = hasCover ? "none" : "inline-flex";
      bannerHas.style.display = hasCover ? "flex" : "none";
    }

    if (avatarAddBtn && avatarHas) {
      avatarAddBtn.style.display = hasAvatar ? "none" : "inline-flex";
      avatarHas.style.display = hasAvatar ? "flex" : "none";
    }
  }

  /* expose onclick handlers */
  window.handleLogout = function () {
    localStorage.removeItem("af_user");
    localStorage.removeItem("af_user_email");
    localStorage.removeItem("af_user_password");
    navigateWithFade("login.html");
  };

  window.goBackToMain = function () {
    navigateWithFade("mainpage.html");
  };

  window.navigateToPost = function (postId) {
    // Store the post ID to open when we get to the main page
    localStorage.setItem("af_open_post", postId);
    navigateWithFade("mainpage.html");
  };

  window.switchTab = function (clickedTab, tabType) {
    document.querySelectorAll(".profile-tab").forEach((tab) => {
      tab.classList.remove("profile-tab-active");
    });
    clickedTab.classList.add("profile-tab-active");

    const threadsContent = document.getElementById("threadsContent");
    const repliesContent = document.getElementById("repliesContent");

    if (tabType === "threads") {
      if (threadsContent) threadsContent.style.display = "block";
      if (repliesContent) repliesContent.style.display = "none";
      renderUserThreads();
    } else {
      if (threadsContent) threadsContent.style.display = "none";
      if (repliesContent) repliesContent.style.display = "block";
      renderUserReplies();
    }
  };

  window.openEditModal = function () {
    const modal = document.getElementById("editProfileModal");
    if (!modal) return;

    modal.style.display = "block";

    const parts = getNameParts(localStorage.getItem("af_user") || name);
    setValue("firstName", parts.first);
    setValue("lastName", parts.last);
    setValue("userEmail", email);

    // Load current images or defaults
    const savedCover = localStorage.getItem(PROFILE_KEYS.COVER);
    const savedAvatar = localStorage.getItem(PROFILE_KEYS.AVATAR);
    
    setSrc("previewImg", savedAvatar || DEFAULTS.AVATAR);
    setSrc("editCoverPreview", savedCover || DEFAULTS.COVER);

    updateEditMediaUI();
  };

  window.closeEditModal = function () {
    const modal = document.getElementById("editProfileModal");
    if (modal) modal.style.display = "none";
  };

  window.triggerCoverPicker = function () {
    const input = document.getElementById("coverPicture");
    if (input) input.click();
  };

  window.triggerAvatarPicker = function () {
    const input = document.getElementById("profilePicture");
    if (input) input.click();
  };

  window.previewImage = function (event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      setSrc("previewImg", e.target.result);
      updateEditMediaUI();
    };
    reader.readAsDataURL(file);
  };

  window.previewCoverInEdit = function (event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      setSrc("editCoverPreview", e.target.result);
      updateEditMediaUI();
    };
    reader.readAsDataURL(file);
  };

  window.removeCoverFromEdit = function () {
    setSrc("editCoverPreview", DEFAULTS.COVER);

    const input = document.getElementById("coverPicture");
    if (input) input.value = "";

    updateEditMediaUI();
  };

  window.removeAvatarFromEdit = function () {
    setSrc("previewImg", DEFAULTS.AVATAR);

    const input = document.getElementById("profilePicture");
    if (input) input.value = "";

    updateEditMediaUI();
  };

  window.saveProfile = function (event) {
    event.preventDefault();

    const firstName = (document.getElementById("firstName") || {}).value || "";
    const lastName = (document.getElementById("lastName") || {}).value || "";
    const newName = (firstName + " " + lastName).trim();

    // Only save the name changes permanently with validation
    if (newName && firstName.trim()) {
      localStorage.setItem("af_user", newName);
      setText(".profile-display-name", newName);
      
      // Save images permanently to localStorage
      const previewAvatar = document.getElementById("previewImg");
      if (previewAvatar && previewAvatar.src && !isDefaultSrc(previewAvatar.src, DEFAULTS.AVATAR)) {
        localStorage.setItem(PROFILE_KEYS.AVATAR, previewAvatar.src);
        setSrc("profileAvatar", previewAvatar.src);
      }

      const previewCover = document.getElementById("editCoverPreview");
      if (previewCover && previewCover.src && !isDefaultSrc(previewCover.src, DEFAULTS.COVER)) {
        localStorage.setItem(PROFILE_KEYS.COVER, previewCover.src);
        setSrc("coverImage", previewCover.src);
      }

      window.closeEditModal();
    } else {
      alert("First name is required.");
    }
  };

  hydrateProfileHeader();
  computeStats();
  setupCoverParallax();
  
  // Load default tab content (threads)
  renderUserThreads();

  // Public function to refresh profile data (can be called from outside)
  window.refreshProfileData = function() {
    computeStats();
    renderUserThreads();
    if (document.getElementById("repliesContent").style.display !== "none") {
      renderUserReplies();
    }
  };
})();
