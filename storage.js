const AF_STORAGE = {
  VERSION: "v7",

  KEYS: {
    POSTS: "af_posts_v7",
    VOTES: "af_votes_v7",
  },

  load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const data = JSON.parse(raw);
      return data ?? fallback;ss
    } catch (e) {
      return fallback;
    }
  },

  save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  // For testing/demo purposes: clear all AF-related data
  clearAll() {
    Object.values(this.KEYS).forEach((k) => localStorage.removeItem(k));
  },
};
