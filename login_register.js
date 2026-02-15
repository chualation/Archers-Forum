document.addEventListener("DOMContentLoaded", () => {
  // page transition animation
  document.body.classList.add("is-ready");

  const links = document.querySelectorAll(".auth-toggle a[href$='.html']");

  links.forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href) return;

      e.preventDefault();

      // Add leaving class
      document.body.classList.add("is-leaving");

      // Navigate after animation finishes
      setTimeout(() => {
        window.location.href = href;
      }, 260);
    });
  });

  // user datbase handling
  const USERS_KEY = "af_users";
  const CURRENT_KEY = "af_current_email";

  function loadUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch (err) {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  // seed demo account
  (function seedDemoAccount() {
    const users = loadUsers();
    const demoExists = users.some(
      (u) => (u.email || "").toLowerCase() === "demo@archersforum.com"
    );

    if (!demoExists) {
      users.push({
        name: "Demo User",
        email: "demo@archersforum.com",
        password: "demo1234",
      });
      saveUsers(users);
    }
  })();

  // Login/Register form handling
  const form = document.getElementById("authForm");
  if (!form) return;

  const mode = form.dataset.mode; // "login" or "register"
  const msg = document.getElementById("authMsg");

  // Show/Hide password toggle
  const pwInput = form.querySelector('input[name="password"]');
  const togglePw = document.getElementById("togglePw");

  if (pwInput && togglePw) {
    // password is hidden by default
    togglePw.dataset.state = "hidden";
    togglePw.src = "assets/show_pass.png";
    togglePw.alt = "Show password";
    togglePw.style.cursor = "pointer";

    togglePw.addEventListener("click", () => {
      const isHidden = pwInput.type === "password";

      if (isHidden) {
        pwInput.type = "text";
        togglePw.src = "assets/hide_pass.png";
        togglePw.alt = "Hide password";
        togglePw.dataset.state = "shown";
      } else {
        pwInput.type = "password";
        togglePw.src = "assets/show_pass.png";
        togglePw.alt = "Show password";
        togglePw.dataset.state = "hidden";
      }
    });
  }

  // Login/Register submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (msg) msg.textContent = "";

    // register
    if (mode === "register") {
      const nameEl = form.querySelector('input[name="name"]');
      const emailEl = form.querySelector('input[name="email"]');

      const name = nameEl ? nameEl.value.trim() : "";
      const email = emailEl ? emailEl.value.trim() : "";
      const password = pwInput ? pwInput.value : "";

      if (!name || !email || !password) {
        if (msg) msg.textContent = "Please fill in all fields.";
        return;
      }

      const users = loadUsers();
      const emailLower = email.toLowerCase();

      const exists = users.some(
        (u) => (u.email || "").toLowerCase() === emailLower
      );

      if (exists) {
        if (msg) msg.textContent = "That email is already registered.";
        return;
      }

      // save to user database
      users.push({ name, email, password });
      saveUsers(users);

      // set "current session"
      localStorage.setItem(CURRENT_KEY, email);

      // keep your existing keys for display/compatibility
      localStorage.setItem("af_user", name);
      localStorage.setItem("af_user_email", email);

      window.location.href = "mainpage.html";
    }

    // login
    if (mode === "login") {
      const emailEl = form.querySelector('input[name="email"]');

      const email = emailEl ? emailEl.value.trim() : "";
      const password = pwInput ? pwInput.value : "";

      const users = loadUsers();
      const emailLower = email.toLowerCase();

      const user = users.find(
        (u) => (u.email || "").toLowerCase() === emailLower && u.password === password
      );

      if (user) {
        // set "current session"
        localStorage.setItem(CURRENT_KEY, user.email);

        // keep your existing keys for display/compatibility
        localStorage.setItem("af_user", user.name);
        localStorage.setItem("af_user_email", user.email);

        window.location.href = "mainpage.html";
      } else {
        if (msg) msg.textContent = "Invalid email or password.";
      }
    }
  });
});
