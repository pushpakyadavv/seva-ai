// ============================================================
// Supabase client + backend URL config
// ============================================================
const SUPABASE_URL = "https://lyjnjnrkbfdlvvkqmgfa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5am5qbnJrYmZkbHZ2a3FtZ2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MDg4NDgsImV4cCI6MjEwNTk4NDg0OH0.vGnHkpY4rM0ZlrlOKlAto_uoLkFdL7bHMtUcV0kjZwI";
const BACKEND_URL = "http://localhost:8000";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getJWT() {
  const { data } = await db.auth.getSession();
  return data?.session?.access_token || null;
}

async function apiFetch(path, options = {}) {
  const jwt = await getJWT();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {})
  };
  const res = await fetch(`${BACKEND_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

function startClock(elId, footId) {
  function tick() {
    const now = new Date();
    const s = now.toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    }).replace(",", "");
    const el = document.getElementById(elId);
    if (el) el.innerText = s + " IST";
    const f = document.getElementById(footId);
    if (f) f.innerText = s;
  }
  tick(); setInterval(tick, 1000);
}

function randomSessionId() {
  const chars = "ABCDEF0123456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s.match(/.{1,4}/g).join("-");
}

function toast(msg, type = "") {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.className = "toast show " + type;
  el.innerText = msg;
  setTimeout(() => el.classList.remove("show"), 3200);
}