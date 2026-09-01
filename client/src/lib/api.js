const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const { method = "GET", body, auth = true } = options;

  const headers = { "Content-Type": "application/json" };

  if (auth && typeof window !== "undefined") {
    const token = localStorage.getItem("gapino-token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = {};
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const error = new Error(data.message || "خطا در ارتباط با سرور");
    error.status = res.status;
    throw error;
  }

  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
  delete: (path, opts) => request(path, { ...opts, method: "DELETE" }),
};

export async function uploadFile(path, formData) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("gapino-token") : null;

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData, // Content-Type را مرورگر خودش با boundary می‌سازد
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "خطا در آپلود فایل");
  return data;
}
