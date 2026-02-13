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

  const POSTS_KEY =
    window.AF_STORAGE && AF_STORAGE.KEYS && AF_STORAGE.KEYS.POSTS
      ? AF_STORAGE.KEYS.POSTS
      : "af_posts_v4";

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

    const savedCover = localStorage.getItem(PROFILE_KEYS.COVER);
    const savedAvatar = localStorage.getItem(PROFILE_KEYS.AVATAR);

    setSrc("coverImage", savedCover ? savedCover : DEFAULTS.COVER);
    setSrc("profileAvatar", savedAvatar ? savedAvatar : DEFAULTS.AVATAR);
  }

  function computeStats() {
    const posts = loadJSON(POSTS_KEY, []);
    const mine = posts.filter((p) => p && p.authorEmail === email);

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
    if (allTabs[1]) allTabs[1].textContent = `My Replies (0)`;
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
    } else {
      if (threadsContent) threadsContent.style.display = "none";
      if (repliesContent) repliesContent.style.display = "block";
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

    // set current images in preview
    const avatarNow = document.getElementById("profileAvatar");
    const coverNow = document.getElementById("coverImage");

    setSrc("previewImg", avatarNow ? avatarNow.src : DEFAULTS.AVATAR);
    setSrc("editCoverPreview", coverNow ? coverNow.src : DEFAULTS.COVER);

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
    // reset preview to default
    setSrc("editCoverPreview", DEFAULTS.COVER);

    const input = document.getElementById("coverPicture");
    if (input) input.value = "";

    updateEditMediaUI();
  };

  window.removeAvatarFromEdit = function () {
    // reset avatar preview to default
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

    if (newName) {
      localStorage.setItem("af_user", newName);
      setText(".profile-display-name", newName);
    }

    // save avatar
    const previewAvatar = document.getElementById("previewImg");
    if (previewAvatar && previewAvatar.src) {
      setSrc("profileAvatar", previewAvatar.src);

      if (isDefaultSrc(previewAvatar.src, DEFAULTS.AVATAR)) {
        localStorage.removeItem(PROFILE_KEYS.AVATAR);
      } else {
        localStorage.setItem(PROFILE_KEYS.AVATAR, previewAvatar.src);
      }
    }

    // save cover
    const previewCover = document.getElementById("editCoverPreview");
    if (previewCover && previewCover.src) {
      setSrc("coverImage", previewCover.src);

      if (isDefaultSrc(previewCover.src, DEFAULTS.COVER)) {
        localStorage.removeItem(PROFILE_KEYS.COVER);
      } else {
        localStorage.setItem(PROFILE_KEYS.COVER, previewCover.src);
      }
    }

    window.closeEditModal();
  };

  // Init
  hydrateProfileHeader();
  computeStats();
  setupCoverParallax();
})();
