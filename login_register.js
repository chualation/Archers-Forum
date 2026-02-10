document.addEventListener("DOMContentLoaded", () => {
  // page transition animation 
  document.body.classList.add("is-ready");

  const links = document.querySelectorAll(".auth-toggle a[href$='.html']");

  links.forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href) return;

      e.preventDefault();

      // Add leaving class (CSS handles the smooth animation)
      document.body.classList.add("is-leaving");

      // Navigate after animation finishes
      setTimeout(() => {
        window.location.href = href;
      }, 260);
    });
  });

  // Login/Register form handling
  const form = document.getElementById("authForm");
  if (!form) return;

  const mode = form.dataset.mode; // "login" or "register"
  const msg = document.getElementById("authMsg");

  // Show/Hide password toggle
  const pwInput = form.querySelector('input[name="password"]');
  const togglePw = document.getElementById("togglePw");

  if (pwInput && togglePw) {
    // default state (password hidden)
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

      localStorage.setItem("af_user", name);
      localStorage.setItem("af_user_email", email);
      localStorage.setItem("af_user_password", password);

      window.location.href = "mainpage.html";
    }

    // login
    if (mode === "login") {
      const emailEl = form.querySelector('input[name="email"]');

      const email = emailEl ? emailEl.value.trim() : "";
      const password = pwInput ? pwInput.value : "";

      const storedEmail = localStorage.getItem("af_user_email");
      const storedPassword = localStorage.getItem("af_user_password");

      if (email === storedEmail && password === storedPassword) {
        window.location.href = "mainpage.html";
      } else {
        if (msg) msg.textContent = "Invalid email or password.";
      }
    }
  });

  if (
    !localStorage.getItem("af_user_email") &&
    !localStorage.getItem("af_user_password")
  ) {
    localStorage.setItem("af_user", "Demo User");
    localStorage.setItem("af_user_email", "demo@archersforum.com");
    localStorage.setItem("af_user_password", "demo1234");
  }
});
