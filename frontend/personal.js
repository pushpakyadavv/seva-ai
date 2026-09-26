let CURRENT_USER = null;
let CURRENT_TOKEN = null;

// ============================================================
// 20-QUESTION SELF-ASSESSMENT (3 sets: 7 + 7 + 6)
// ============================================================
const QUESTIONNAIRE = {
  1: [
    { q: "I have been feeling tense or on edge during the past week.", q_hi: "पिछले सप्ताह मैं तनाव या बेचैनी महसूस कर रहा हूँ।", q_ta: "கடந்த வாரம் நான் பதற்றமாக உணர்ந்தேன்." },
    { q: "I have had difficulty falling or staying asleep.", q_hi: "मुझे सोने में कठिनाई हुई है।", q_ta: "நான் தூங்குவதில் சிரமம் இருந்தது." },
    { q: "I have felt overwhelmed by my duties.", q_hi: "मैं अपने कर्तव्यों से अभिभूत महसूस करता हूँ।", q_ta: "என் கடமைகளால் மிகைப்படுத்தப்பட்டதாக உணர்ந்தேன்." },
    { q: "I have had trouble concentrating on tasks.", q_hi: "मुझे कार्यों पर ध्यान केंद्रित करने में कठिनाई हुई।", q_ta: "பணிகளில் கவனம் செலுத்த சிரமம் இருந்தது." },
    { q: "I have felt isolated from my comrades.", q_hi: "मैं अपने साथियों से अलग महसूस करता हूँ।", q_ta: "என் தோழர்களிடமிருந்து தனிமை உணர்ந்தேன்." },
    { q: "I have experienced physical fatigue without exertion.", q_hi: "बिना परिश्रम के मुझे थकान हुई है।", q_ta: "உடல் உழைப்பு இல்லாமல் சோர்வு ஏற்பட்டது." },
    { q: "I have been irritable with those around me.", q_hi: "मैं अपने आस-पास के लोगों पर चिड़चिड़ा रहा हूँ।", q_ta: "சுற்றியுள்ளவர்களிடம் எரிச்சலடைந்தேன்." }
  ],
  2: [
    { q: "I have lost interest in activities I once enjoyed.", q_hi: "मैंने पसंदीदा गतिविधियों में रुचि खो दी है।", q_ta: "முன்பு மகிழ்ச்சி தந்த செயல்களில் ஆர்வம் இழந்தேன்." },
    { q: "I worry excessively about my family's wellbeing.", q_hi: "मैं परिवार की भलाई के बारे में अत्यधिक चिंता करता हूँ।", q_ta: "குடும்ப நலனைப் பற்றி அதிகம் கவலைப்படுகிறேன்." },
    { q: "I have had difficulty making routine decisions.", q_hi: "मुझे सामान्य निर्णय लेने में कठिनाई हुई।", q_ta: "வழக்கமான முடிவுகளை எடுப்பதில் சிரமம் இருந்தது." },
    { q: "I have felt my work performance has declined.", q_hi: "मेरे कार्य प्रदर्शन में गिरावट आई है।", q_ta: "என் பணி செயல்திறன் குறைந்தது." },
    { q: "I have experienced unexplained physical pain.", q_hi: "मुझे अस्पष्ट शारीरिक दर्द हुआ है।", q_ta: "விளக்கமற்ற உடல் வலி ஏற்பட்டது." },
    { q: "I have had trouble relaxing even during rest periods.", q_hi: "आराम की अवधि में भी मुझे कठिनाई हुई।", q_ta: "ஓய்வு நேரத்திலும் நிதானமாக இருக்க சிரமம்." },
    { q: "I have felt emotionally numb or detached.", q_hi: "मैं भावनात्मक रूप से सुन्न महसूस करता हूँ।", q_ta: "உணர்ச்சி ரீதியாக மரத்துப் போனதாக உணர்ந்தேன்." }
  ],
  3: [
    { q: "I have had thoughts of self-harm or hopelessness.", q_hi: "मुझे स्वयं को हानि या निराशा के विचार आए हैं।", q_ta: "சுய-தீங்கு அல்லது நம்பிக்கையின்மை பற்றிய எண்ணங்கள்." },
    { q: "I have been avoiding social contact.", q_hi: "मैं सामाजिक संपर्क से बच रहा हूँ।", q_ta: "சமூக தொடர்பைத் தவிர்க்கிறேன்." },
    { q: "I have increased reliance on substances (alcohol/tobacco).", q_hi: "मैंने पदार्थों पर निर्भरता बढ़ाई है।", q_ta: "பொருட்கள் சார்ந்திருப்பு அதிகரித்தது." },
    { q: "I have felt a sense of meaninglessness in my work.", q_hi: "कार्य में अर्थहीनता महसूस की है।", q_ta: "பணியில் அர்த்தமின்மையை உணர்ந்தேன்." },
    { q: "I have had difficulty controlling my anger.", q_hi: "क्रोध को नियंत्रित करने में कठिनाई हुई।", q_ta: "கோபத்தைக் கட்டுப்படுத்த சிரமம்." },
    { q: "I would benefit from speaking to a Welfare Officer.", q_hi: "कल्याण अधिकारी से बात करने से लाभ होगा।", q_ta: "நல அதிகாரியுடன் பேசுவது பயனுள்ளதாக இருக்கும்." }
  ]
};

const LIKERT = [
  { v: 1, en: "Never", hi: "कभी नहीं", ta: "ஒருபோதும் இல்லை" },
  { v: 2, en: "Rarely", hi: "शायद ही कभी", ta: "அரிதாக" },
  { v: 3, en: "Sometimes", hi: "कभी-कभी", ta: "சில நேரம்" },
  { v: 4, en: "Often", hi: "अक्सर", ta: "அடிக்கடி" },
  { v: 5, en: "Always", hi: "हमेशा", ta: "எப்போதும்" }
];

let WIZ_STEP = 1;
let WIZ_ANSWERS = { 1: {}, 2: {}, 3: {} };

function renderWizard() {
  const body = document.getElementById("wizardBody");
  if (!body) return;
  const questions = QUESTIONNAIRE[WIZ_STEP];
  body.innerHTML = "";

  questions.forEach((item, idx) => {
    const globalN = (WIZ_STEP - 1) * 7 + idx + 1;
    const qText = CURRENT_LANG === "hi" ? item.q_hi : CURRENT_LANG === "ta" ? item.q_ta : item.q;

    let likertHtml = "";
    LIKERT.forEach(L => {
      const label = CURRENT_LANG === "hi" ? L.hi : CURRENT_LANG === "ta" ? L.ta : L.en;
      const checked = WIZ_ANSWERS[WIZ_STEP][idx] === L.v;
      likertHtml += `<label class="${checked ? 'checked' : ''}" onclick="pickAnswer(${WIZ_STEP}, ${idx}, ${L.v}, this)">${label}</label>`;
    });

    body.innerHTML += `
      <div class="question">
        <div class="q-text"><span class="qn">${globalN}</span>${qText}</div>
        <div class="likert">${likertHtml}</div>
      </div>`;
  });

  document.querySelectorAll(".step-pill").forEach(p => {
    const s = parseInt(p.dataset.step);
    p.classList.toggle("active", s === WIZ_STEP);
    p.classList.toggle("done", s < WIZ_STEP);
  });

  document.getElementById("wizProgress").style.width = (WIZ_STEP / 3 * 100) + "%";
  document.getElementById("setLabel").innerText = WIZ_STEP;
  document.getElementById("btnPrev").style.visibility = WIZ_STEP === 1 ? "hidden" : "visible";
  const nextBtn = document.getElementById("btnNext");
  nextBtn.innerText = WIZ_STEP === 3 ? "Submit All" : t("next");
}

function pickAnswer(step, qIdx, value, el) {
  WIZ_ANSWERS[step][qIdx] = value;
  el.parentElement.querySelectorAll("label").forEach(l => l.classList.remove("checked"));
  el.classList.add("checked");
}

function wizardNext() {
  const set = WIZ_ANSWERS[WIZ_STEP];
  const answered = Object.keys(set).length;
  const required = QUESTIONNAIRE[WIZ_STEP].length;

  if (answered < required) {
    toast(`Please answer all ${required} questions (${answered} answered).`, "error");
    return;
  }

  if (WIZ_STEP === 3) { submitFullAssessment(); return; }

  WIZ_STEP++;
  renderWizard();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function wizardPrev() {
  if (WIZ_STEP > 1) { WIZ_STEP--; renderWizard(); }
}

async function submitFullAssessment() {
  if (!CURRENT_TOKEN) { toast("Token not assigned.", "error"); return; }

  try {
    for (let step = 1; step <= 3; step++) {
      const answers = Object.values(WIZ_ANSWERS[step]);
      await apiFetch("/self-report-set", {
        method: "POST",
        body: JSON.stringify({
          soldier_token: CURRENT_TOKEN,
          set_number: step,
          answers: answers,
          notes: `Set ${step} submitted via wizard`
        })
      });
    }
    toast("All 3 sets submitted. Assessment complete.", "success");
    WIZ_ANSWERS = { 1: {}, 2: {}, 3: {} };
    WIZ_STEP = 1;
    renderWizard();
    await refreshWellness();
  } catch (e) {
    toast("Submit failed: " + e.message, "error");
  }
}

// ============================================================
// AUTH + DASHBOARD
// ============================================================
async function doLogin() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errEl = document.getElementById("loginError");
  errEl.innerText = "";

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { errEl.innerText = "Authentication failed: " + error.message; return; }

  CURRENT_USER = data.user;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", CURRENT_USER.id).single();
  if (!profile || profile.role !== "personal") {
    errEl.innerText = "Access denied. This console is for Personal role only.";
    await supabase.auth.signOut();
    return;
  }

  document.getElementById("svcNo").innerText = profile.service_number || "—";
  document.getElementById("rankEl").innerText = profile.rank || "—";
  document.getElementById("unitEl").innerText = profile.unit_id || "—";

  document.getElementById("loginView").classList.add("hidden");
  document.getElementById("dashboardView").classList.remove("hidden");

  document.getElementById("sessId").innerText = randomSessionId();
  startClock("liveClock", "footTime");

  await refreshWellness();
  renderWizard();
  setInterval(refreshWellness, 60000);
}

async function refreshWellness() {
  const loading = document.getElementById("loadingBlock");
  const data = document.getElementById("dataBlock");

  try {
    const res = await apiFetch("/personal/me");
    loading.classList.add("hidden");
    data.classList.remove("hidden");

    const risk = res.risk_level || "Unknown";
    CURRENT_TOKEN = res.token || null;

    const riskEl = document.getElementById("riskVal");
    riskEl.innerText = risk.toUpperCase();
    riskEl.style.color =
      risk === "High" ? "var(--red)" :
      risk === "Medium" ? "var(--amber)" :
      risk === "Low" ? "var(--green)" : "var(--muted)";

    document.getElementById("riskNote").innerText =
      risk === "Unknown" ? "No assessment on record" : "Assessed by predictive engine";

    const score = (res.score || 0) * 10;
    document.getElementById("scoreVal").innerHTML = `${score.toFixed(1)}<small>/10</small>`;
    const bar = document.getElementById("scoreBar");
    bar.style.width = Math.min(100, score * 10) + "%";
    bar.className = "bar-fill " + (
      risk === "High" ? "bf-red" : risk === "Medium" ? "bf-amber" : "bf-green"
    );

    document.getElementById("tokenVal").innerText = CURRENT_TOKEN || "Not assigned";
    document.getElementById("inlineToken").innerText = "#" + (CURRENT_TOKEN || "").slice(0, 13).toUpperCase();
    document.getElementById("syncVal").innerText = res.updated_at
      ? new Date(res.updated_at).toLocaleString("en-GB", { hour12: false })
      : "—";

    document.getElementById("suggestionText").innerText = res.suggestion || "—";
  } catch (e) {
    loading.innerText = "Error: " + e.message;
  }
}

async function doLogout() {
  await supabase.auth.signOut();
  location.reload();
}

// Auto-login
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (profile?.role === "personal") {
      CURRENT_USER = session.user;
      document.getElementById("svcNo").innerText = profile.service_number || "—";
      document.getElementById("rankEl").innerText = profile.rank || "—";
      document.getElementById("unitEl").innerText = profile.unit_id || "—";
      document.getElementById("loginView").classList.add("hidden");
      document.getElementById("dashboardView").classList.remove("hidden");
      document.getElementById("sessId").innerText = randomSessionId();
      startClock("liveClock", "footTime");
      await refreshWellness();
      renderWizard();
      setInterval(refreshWellness, 60000);
    }
  }
})();