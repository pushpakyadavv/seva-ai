function toggleMenu(id) {
  document.querySelectorAll(".menu-dropdown").forEach(d => {
    if (d.id !== id) d.classList.remove("open");
  });
  document.getElementById(id).classList.toggle("open");
}
document.addEventListener("click", e => {
  if (!e.target.closest(".menu-wrap")) {
    document.querySelectorAll(".menu-dropdown").forEach(d => d.classList.remove("open"));
  }
});

async function doLogin() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errEl = document.getElementById("loginError");
  errEl.innerText = "";

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { errEl.innerText = "Authentication failed: " + error.message; return; }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
  if (!profile || profile.role !== "commander") {
    errEl.innerText = "Access denied. Commander credentials required.";
    await supabase.auth.signOut();
    return;
  }

  document.getElementById("cmdId").innerText = profile.service_number || "—";
  document.getElementById("rankEl").innerText = profile.rank || "—";
  document.getElementById("unitEl").innerText = profile.unit_id || "—";

  document.getElementById("loginView").classList.add("hidden");
  document.getElementById("dashboardView").classList.remove("hidden");
  document.getElementById("sessId").innerText = randomSessionId();
  startClock("liveClock", "footTime");

  await loadOverview();
  setInterval(loadOverview, 120000);
}

async function loadOverview() {
  try {
    const d = await apiFetch("/commander/overview");
    const avg = d.avg_score || 0;
    const wellness = d.wellness_index || 0;
    const total = d.total_soldiers || 0;
    const high = d.high_risk || 0;
    const med = d.medium_risk || 0;
    const low = d.low_risk || 0;

    document.getElementById("avgVal").innerHTML = `${(avg * 10).toFixed(2)}<small>/10</small>`;
    const avgBar = document.getElementById("avgBar");
    avgBar.style.width = Math.min(100, avg * 100) + "%";
    avgBar.className = "bar-fill " + (
      avg > 0.6 ? "bf-red" : avg > 0.35 ? "bf-amber" : "bf-green"
    );

    document.getElementById("highVal").innerText = high;
    document.getElementById("totalVal").innerText = total;

    const readiness = wellness > 65 ? "Nominal" : wellness > 35 ? "Degraded" : "Critical";
    document.getElementById("readinessVal").innerText = readiness;

    document.getElementById("wellnessVal").innerText = wellness.toFixed(1) + "%";
    const wBar = document.getElementById("wellnessBar");
    wBar.style.width = wellness + "%";
    wBar.className = "bar-fill " + (
      wellness > 65 ? "bf-green" : wellness > 35 ? "bf-amber" : "bf-red"
    );

    document.getElementById("nominalCount").innerText = low;
    document.getElementById("obsCount").innerText = med;
    document.getElementById("priCount").innerText = high;

    const pct = n => total ? ((n / total) * 100).toFixed(1) + "%" : "0%";
    document.getElementById("nominalPct").innerText = pct(low);
    document.getElementById("obsPct").innerText = pct(med);
    document.getElementById("priPct").innerText = pct(high);
  } catch (e) {
    toast("Failed to load overview: " + e.message, "error");
  }
}

function openImport() {
  document.querySelectorAll(".menu-dropdown").forEach(d => d.classList.remove("open"));
  document.getElementById("importPanel").classList.remove("hidden");
  document.getElementById("importPanel").scrollIntoView({ behavior: "smooth" });
}

function handleFile(file) {
  if (!file) return;
  document.getElementById("fileName").innerText = "📄 " + file.name + " (" + (file.size / 1024).toFixed(1) + " KB)";
  uploadCSV(file);
}

async function uploadCSV(file) {
  const resultEl = document.getElementById("importResult");
  resultEl.innerHTML = '<div class="loading">Uploading and processing...</div>';

  const jwt = await getJWT();
  const form = new FormData();
  form.append("file", file);

  try {
    const res = await fetch(`${BACKEND_URL}/commander/import`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body: form
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();

    const hasErrors = data.errors && data.errors.length > 0;
    resultEl.innerHTML = `
      <div class="import-result ${hasErrors ? 'warn' : ''}">
        <strong>${data.status === "success" ? "✅ Import successful" : "⚠️ Completed with warnings"}</strong><br>
        File: <code>${data.filename}</code><br>
        Rows inserted: <strong>${data.rows_inserted}</strong><br>
        Rows skipped: <strong>${data.rows_skipped}</strong>
        ${hasErrors ? `<br><br><strong>Errors (first ${data.errors.length}):</strong><br><pre style="font-size:11px;white-space:pre-wrap;margin-top:6px;">${JSON.stringify(data.errors, null, 2)}</pre>` : ""}
      </div>`;
    toast("Import complete", "success");
    await loadOverview();
  } catch (e) {
    resultEl.innerHTML = `<div class="import-result warn"><strong>❌ Import failed</strong><br>${e.message}</div>`;
    toast("Import failed", "error");
  }
}

function downloadTemplate() {
  const csv = `service_number,heart_rate,hrv,sleep_hours,stress_level,notes
AR-23007-A,78,55,7.2,4,Routine check
AR-23014-B,95,32,5.0,8,Post-deployment
AR-23021-C,72,62,7.8,2,Nominal`;
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "seva_ai_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
  toast("Template downloaded", "success");
}

// Drag-and-drop
document.addEventListener("DOMContentLoaded", () => {
  const dz = document.getElementById("dropZone");
  if (!dz) return;
  ["dragenter","dragover"].forEach(ev => dz.addEventListener(ev, e => {
    e.preventDefault(); dz.classList.add("dragover");
  }));
  ["dragleave","drop"].forEach(ev => dz.addEventListener(ev, e => {
    e.preventDefault(); dz.classList.remove("dragover");
  }));
  dz.addEventListener("drop", e => {
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
});

function refreshOverview() {
  document.querySelectorAll(".menu-dropdown").forEach(d => d.classList.remove("open"));
  loadOverview();
  toast("Overview refreshed", "success");
}

async function doLogout() {
  await supabase.auth.signOut();
  location.reload();
}

(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (profile?.role === "commander") {
      document.getElementById("cmdId").innerText = profile.service_number || "—";
      document.getElementById("rankEl").innerText = profile.rank || "—";
      document.getElementById("unitEl").innerText = profile.unit_id || "—";
      document.getElementById("loginView").classList.add("hidden");
      document.getElementById("dashboardView").classList.remove("hidden");
      document.getElementById("sessId").innerText = randomSessionId();
      startClock("liveClock", "footTime");
      loadOverview();
      setInterval(loadOverview, 120000);
    }
  }
})();