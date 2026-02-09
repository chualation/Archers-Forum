(function (){
  /* Fade In if page is ready */
  function markReady(){
    document.body.classList.add("is-ready");
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", markReady);
  }else{
    markReady();
  }

  /* Video will resume/continue between login and register pages*/
  const bgVideo = document.getElementById("bgVideo");
  const VIDEO_KEY = "af_bgVideoTime_v1";

  if(bgVideo){
    const saved = sessionStorage.getItem(VIDEO_KEY);

    bgVideo.addEventListener("loadedmetadata", () => {
      if(saved !== null){
        const t = parseFloat(saved);
        if(!Number.isNaN(t)){
          const dur = Number.isFinite(bgVideo.duration) ? bgVideo.duration : t;
          bgVideo.currentTime = Math.max(0, Math.min(t, dur));
        }
      }

      const playPromise = bgVideo.play();
      if(playPromise && typeof playPromise.catch === "function"){
        playPromise.catch(() => {});
      }
    });
  }

  /* Toggle animation for login and register page */
  const toggle = document.querySelector(".auth-toggle");

  const prefersReduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const TOGGLE_MS = prefersReduced ? 1 : 520;
  const PAGE_MS   = prefersReduced ? 1 : 280;

  if(toggle){
    const links = toggle.querySelectorAll(".toggle-item");

    links.forEach((a) => {
      a.addEventListener("click", (e) => {
        const target  = a.getAttribute("data-target");
        const href    = a.getAttribute("href");
        const current = toggle.getAttribute("data-active");

        if(target === current){
          return;
        }

        e.preventDefault();

        if(bgVideo){
          sessionStorage.setItem(VIDEO_KEY, String(bgVideo.currentTime || 0));
        }

        toggle.classList.add("is-switching");
        toggle.setAttribute("data-active", target);

        window.setTimeout(() => {
          document.body.classList.add("is-exiting");
        }, Math.max(0, TOGGLE_MS - PAGE_MS));

        window.setTimeout(() => {
          window.location.href = href;
        }, TOGGLE_MS);
      });
    });
  }

  /* Form logic*/
  const form = document.getElementById("authForm");
  if(!form){
    return;
  }

  const mode = form.getAttribute("data-mode");
  const msg  = document.getElementById("authMsg");

  /* Demo account */
  const DEMO = {
    name: "Admin",
    email: "admin@archersforum.com",
    password: "admin123"
  };

  function ensureDemoAccount(){
    const key = (typeof AF_USERS_KEY !== "undefined") ? AF_USERS_KEY : "af_users_v1";

    const raw   = localStorage.getItem(key);
    const users = raw ? JSON.parse(raw) : [];

    const exists = users.some(
      u => (u.email || "").toLowerCase() === DEMO.email.toLowerCase()
    );

    if(!exists){
      users.push(DEMO);
      localStorage.setItem(key, JSON.stringify(users));
    }
  }
  ensureDemoAccount();

  /* Show or Hide password upon user's preference*/
  const togglePw = document.getElementById("togglePw");
  const pwInput  = document.getElementById("password");

  if(togglePw && pwInput){
    togglePw.addEventListener("click", () => {
      const hidden = pwInput.type === "password";
      pwInput.type = hidden ? "text" : "password";
      togglePw.src = hidden ? "assets/hide_pass.png" : "assets/show_pass.png";
      togglePw.alt = hidden ? "Hide password" : "Show password";
    });
  }

  /* Submit button handler*/
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if(msg) msg.textContent = "";

    if(mode === "register"){
      const name     = form.querySelector('[name="name"]')?.value.trim();
      const email    = form.querySelector('[name="email"]')?.value.trim();
      const password = form.querySelector('[name="password"]')?.value.trim();

      if(!name || !email || !password){
        if(msg) msg.textContent = "Please fill in all fields.";
        return;
      }

      const res = createUser(name, email, password);
      if(!res.ok){
        if(msg) msg.textContent = res.message || "Registration failed.";
        return;
      }

      localStorage.setItem("af_user", name);
      localStorage.setItem("af_user_email", email);
      window.location.href = "forum.html";
      return;
    }

    /* Login handler */
    const email    = form.querySelector('[name="email"]')?.value.trim();
    const password = form.querySelector('[name="password"]')?.value.trim();

    if(!email || !password){
      if(msg) msg.textContent = "Please enter your email and password.";
      return;
    }

    const res = validateLogin(email, password);
    if(!res.ok){
      if(msg) msg.textContent = res.message || "Invalid email or password.";
      return;
    }

    localStorage.setItem("af_user", res.user.name);
    localStorage.setItem("af_user_email", res.user.email);
    window.location.href = "forum.html";
  });

})();
