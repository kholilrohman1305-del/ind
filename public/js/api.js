window.api = (() => {
  let csrfToken = null;

  const fetchCsrfToken = async () => {
    const res = await fetch("/api/csrf-token", { credentials: "same-origin" });
    if (res.ok) {
      const data = await res.json();
      csrfToken = data.csrfToken;
    }
    return csrfToken;
  };

  const request = async (url, options = {}) => {
    if (!csrfToken) await fetchCsrfToken();

    const method = (options.method || "GET").toUpperCase();
    const headers = { ...(options.headers || {}) };

    if (method !== "GET" && method !== "HEAD") {
      headers["X-CSRF-Token"] = csrfToken;
      if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
      }
    }

    let res = await fetch(url, {
      ...options,
      headers,
      credentials: "same-origin",
    });

    if (res.status === 403) {
      await fetchCsrfToken();
      headers["X-CSRF-Token"] = csrfToken;
      res = await fetch(url, {
        ...options,
        headers,
        credentials: "same-origin",
      });
    }

    return res;
  };

  return { request, fetchCsrfToken };
})();
