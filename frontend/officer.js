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
  if (!profile || profile.role !== "welfare_officer") {
    errEl.innerText = "Access denied. Welfare Officer credentials required.";
    await supabase.auth.signOut();
    return;
  }

  document.getElementById("officerId").innerText = profile.service_number || "—";
  document.getElementById("rankEl").innerText = profile.rank || "—";
  document.getElementById("unitEl").innerText = profile.unit_id || "—";

  document.getElementById("loginView").classList.add("hidden");
  document.getElementById("dashboardView").classList.remove("hidden");
  document.getElementById("sessId").innerText = randomSessionId();
  startClock("liveClock", "footTime");

  await loadRegister();
}

async function loadRegister() {
  const tbody = document.getElementById("registerBody");
  tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading register...</td></tr>';

  try {
    const rows = await apiFetch("/officer/register");

    const high = rows.filter(r => r.risk_level === "High").length;
    const med = rows.filter(r => r.risk_level === "Medium").length;
    const low = rows.filter(r => r.risk_level === "Low").length;

    document.getElementById("totalEl").innerText = rows.length;
    document.getElementById("highEl").innerText = high;
    document.getElementById("medEl").innerText = med;
    document.getElementById("lowEl").innerText = low;

    const order = { High: 1, Medium: 2, Low: 3, Unknown: 4 };
    rows.sort((a, b) => (order[a.risk_level] || 5) - (order[b.risk_level] || 5));

    document.getElementById("lastUpdated").innerText = "Last updated: " + new Date().toLocaleTimeString("en-GB");
    tbody.innerHTML = "";

    rows.forEach((r, i) => {
      const tagClass =
        r.risk_level === "High" ? "tag-high" :
        r.risk_level === "Medium" ? "tag-med" :
        r.risk_level === "Low" ? "tag-low" : "tag-na";

      const actionClass = r.risk_level === "High" ? "btn btn-danger" : "btn";
      const actionText = r.risk_level === "High" ? "Priority Call" : "Schedule Review";

      const updated = r.updated_at
        ? new Date(r.updated_at).toLocaleString("en-GB", { hour12: false, day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })
        : "—";

      tbody.innerHTML += `
        <tr>
          <td class="serial">${String(i + 1).padStart(2, "0")}</td>
          <td class="serial">${r.service_number || "—"}</td>
          <td><strong>${r.name}</strong></td>
          <td><span class="tag ${tagClass}">${r.risk_level}</span></td>
          <td><strong>${(r.score * 10).toFixed(1)}</strong></td>
          <td class="serial">${updated}</td>
          <td><button class="${actionClass}" onclick="handleAction('${r.name}', '${r.token}')">${actionText}</button></td>
        </tr>
      `;
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--red);padding:20px;">Error: ${e.message}</td></tr>`;
  }
}

function handleAction(name, token) {
  toast(`Intervention logged for ${name}`, "success");
}

async function exportData(format) {
  document.querySelectorAll(".menu-dropdown").forEach(d => d.classList.remove("open"));
  try {
    const jwt = await getJWT();
    const res = await fetch(`${BACKEND_URL}/officer/export?format=${format}`, {
      headers: { Authorization: `Bearer ${jwt}` }
    });
    if (!res.ok) throw new Error("Export failed");

    if (format === "json") {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      downloadBlob(blob, `seva_ai_register_${Date.now()}.json`);
    } else {
      const blob = await res.blob();
      downloadBlob(blob, `seva_ai_register_${Date.now()}.csv`);
    }
    toast(`Exported as ${format.toUpperCase()}`, "success");
  } catch (e) {
    toast("Export failed: " + e.message, "error");
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function refreshRegister() {
  document.querySelectorAll(".menu-dropdown").forEach(d => d.classList.remove("open"));
  loadRegister();
}

async function doLogout() {
  await supabase.auth.signOut();
  location.reload();
}

(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (profile?.role === "welfare_officer") {
      document.getElementById("officerId").innerText = profile.service_number || "—";
      document.getElementById("rankEl").innerText = profile.rank || "—";
      document.getElementById("unitEl").innerText = profile.unit_id || "—";
      document.getElementById("loginView").classList.add("hidden");
      document.getElementById("dashboardView").classList.remove("hidden");
      document.getElementById("sessId").innerText = randomSessionId();
      startClock("liveClock", "footTime");
      loadRegister();
    }
  }
})();