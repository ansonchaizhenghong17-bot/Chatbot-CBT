// ====== Elements ======
const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("input");
const resetBtn = document.getElementById("resetBtn");

const optionsEl = document.getElementById("options");
const optionsTitle = document.getElementById("optionsTitle");
const scenarioArea = document.getElementById("scenarioArea");

const kioskToggle = document.getElementById("kioskToggle");
const longToggle = document.getElementById("longToggle");
const themeToggle = document.getElementById("themeToggle");
const ttsToggle = document.getElementById("ttsToggle");

const modePill = document.getElementById("modePill");
const stepPill = document.getElementById("stepPill");
const hintPill = document.getElementById("hintPill");
const progressBar = document.getElementById("progressBar");

const studentIdEl = document.getElementById("studentId");

const summaryModal = document.getElementById("summaryModal");
const summaryContent = document.getElementById("summaryContent");
const closeSummary = document.getElementById("closeSummary");
const copySummary = document.getElementById("copySummary");
const newStudent = document.getElementById("newStudent");

let kioskMode = false;
let longMode = true;
let ttsEnabled = false;

// ====== Utils ======
function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
function normalize(s){ return (s || "").toLowerCase().trim(); }
function shorten(text, max=95){
  const t = (text||"").trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return t.slice(0, max-1) + "…";
}
function isNumberLike(x){
  const n = Number(String(x).trim());
  return Number.isFinite(n);
}
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function longWrap(parts){
  const clean = parts.filter(Boolean);
  if (longMode) return clean.join("\n\n");
  return clean.join(" ");
}

// ====== TTS (Web Speech API) ======
function canTTS(){
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}
function speak(text){
  if (!ttsEnabled || !canTTS()) return;
  try{
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ms-MY"; // BM (fallback kalau tak ada, browser akan pilih dekat)
    u.rate = 1.0;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  } catch(e){}
}

// ====== Message UI (avatar + speaker button) ======
function makeAvatar(who){
  const a = document.createElement("div");
  a.className = `avatar ${who === "bot" ? "botA" : "userA"}`;
  a.textContent = who === "bot" ? "CBT" : "ME";
  return a;
}

function addMsg(text, who="bot", tag=null) {
  const row = document.createElement("div");
  row.className = `msg ${who}`;

  // avatar
  row.appendChild(makeAvatar(who));

  const wrap = document.createElement("div");
  wrap.className = "bubbleWrap";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (tag) {
    const t = document.createElement("div");
    t.className = `tag ${tag.kind}`;
    t.textContent = tag.text;
    bubble.appendChild(t);
  }

  const content = document.createElement("div");
  content.textContent = text;
  bubble.appendChild(content);

  wrap.appendChild(bubble);

  // speaker button (for bot only)
  if (who === "bot"){
    const actions = document.createElement("div");
    actions.className = "bubbleActions";

    const spk = document.createElement("button");
    spk.type = "button";
    spk.className = "spkBtn";
    spk.textContent = "🔊 Dengar";
    spk.addEventListener("click", () => speak(text));
    actions.appendChild(spk);

    wrap.appendChild(actions);
  }

  row.appendChild(wrap);

  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;

  if (who === "bot") speak(text);
}

// typing indicator 3-dot
function botTyping(delay=380){
  return new Promise(resolve => {
    const row = document.createElement("div");
    row.className = "msg bot";
    row.appendChild(makeAvatar("bot"));

    const wrap = document.createElement("div");
    wrap.className = "bubbleWrap";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    const typing = document.createElement("div");
    typing.className = "typing";
    typing.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
    bubble.appendChild(typing);

    wrap.appendChild(bubble);
    row.appendChild(wrap);
    chat.appendChild(row);
    chat.scrollTop = chat.scrollHeight;

    setTimeout(() => {
      chat.removeChild(row);
      resolve();
    }, delay);
  });
}

async function botSay(text, tag=null, delay=380){
  await botTyping(delay);
  addMsg(text, "bot", tag);
}

// ====== Empathy engine ======
function reflectEmotion(emotion){
  const e = (emotion||"").trim();
  if (!e) return "";
  return pick([
    `Saya dengar kamu rasa "${e}".`,
    `Oh… kamu rasa "${e}" sekarang.`,
    `Baik, perasaan "${e}" itu memang terasa kuat.`
  ]);
}
function validateEmotion(emotion){
  const e = normalize(emotion);
  if (e.includes("takut")) return pick([
    "Rasa takut itu normal bila sesuatu terasa mencabar atau tidak pasti.",
    "Bila takut, badan memang boleh rasa tegang atau berdebar—itu biasa."
  ]);
  if (e.includes("marah")) return pick([
    "Marah selalunya datang bila kita rasa tak adil atau tak didengar. Itu boleh difahami.",
    "Saya faham… marah boleh buat dada rasa panas dan fikiran laju."
  ]);
  if (e.includes("sedih")) return pick([
    "Sedih itu berat. Terima kasih sebab berani cerita—itu bukan mudah.",
    "Saya faham… bila sedih, semua benda rasa perlahan dan lemah semangat."
  ]);
  if (e.includes("risau")) return pick([
    "Risau itu macam otak asyik fikir ‘bagaimana kalau…’. Itu normal.",
    "Saya faham… bila risau, susah nak berhenti fikir walaupun kita mahu."
  ]);
  if (e.includes("malu")) return pick([
    "Malu itu perasaan yang ramai orang rasa. Kamu tidak keseorangan.",
    "Bila malu, kita rasa nak sembunyi—itu reaksi yang biasa."
  ]);
  if (e.includes("neutral") || e.includes("biasa")) return pick([
    "Okay, neutral pun normal. Terima kasih sebab jujur.",
    "Baik—kalau rasa biasa-biasa, itu pun satu maklumat yang bagus."
  ]);
  return pick([
    "Perasaan itu normal bila situasi susah.",
    "Terima kasih sebab kongsi. Itu bukan perkara kecil.",
    "Kamu berani kerana bercakap tentang perasaan."
  ]);
}
function praiseSmall(){
  return pick([
    "Terima kasih sebab kongsi. Itu berani. 🌟",
    "Bagus—kamu sedang cuba, itu sangat dihargai. 👍",
    "Saya bangga kamu berani bercerita. 🌈"
  ]);
}
function gentleBridge(){
  return pick([
    "Jom kita buat langkah kecil sama-sama ya.",
    "Kita pergi perlahan-lahan. Kamu okay.",
    "Saya ada sini. Kita cuba satu langkah dulu."
  ]);
}
function handleIDontKnow(text){
  const t = normalize(text);
  return (
    t === "tak tahu" || t === "tak pasti" || t === "entahlah" ||
    t === "idk" || t === "x tau" || t === "xtau" || t === "??" || t === "tidak tahu"
  );
}

// ====== Situation tone & detect emotion(s) from situation ======
function situationTone(situation){
  const t = normalize(situation);
  const neutral = ["biasa-biasa","biasa je","ok je","okay je","takde apa","tak ada apa","nothing","saja","entah","normal je","macam biasa","tidak apa","tak apa"];
  const positive = ["gembira","seronok","happy","best","lega","syukur","ok sangat","baik"];
  const stressful = ["diejek","ejek","buli","dibuli","ketawa","malu","tak nak sekolah","takut","menangis","sedih","marah","risau","cemas","panik","ugut","pukul","kasar","dimarah","jerit","benci saya","tak suka saya","keseorangan","sunyi"];
  if (stressful.some(w => t.includes(w))) return "stress";
  if (positive.some(w => t.includes(w))) return "positive";
  if (neutral.some(w => t.includes(w))) return "neutral";
  if (t.length <= 3) return "neutral";
  return "unknown";
}
function emotionGroup(emotion){
  const e = normalize(emotion);
  if (e.includes("sedih")) return "sad";
  if (e.includes("risau") || e.includes("cemas")) return "anx";
  if (e.includes("marah")) return "angry";
  if (e.includes("takut")) return "fear";
  if (e.includes("malu")) return "shame";
  if (e.includes("neutral") || e.includes("biasa")) return "neutral";
  return "unknown";
}

// detect top 1–2 emotions from situation
function detectEmotionsFromSituation(situation, scenarioKey){
  const t = normalize(situation);

  const kFear = ["takut","cemas","panik","ugut","ancam","bahaya","tak selamat","tak nak sekolah"];
  const kAnx  = ["risau","bimbang","exam","peperiksaan","markah","ujian","tak sempat","tak siap"];
  const kSad  = ["sedih","menangis","sunyi","keseorangan","ditinggalkan","tak nak main","tak ada kawan"];
  const kAng  = ["marah","geram","benci","menyampah","tak adil","sakit hati"];
  const kShm  = ["malu","ketawa","diejek","ejek","dibuli","buli","hina","bodoh","diperli"];

  const score = { Takut:0, Risau:0, Sedih:0, Marah:0, Malu:0, Neutral:0 };
  const add = (emo, n) => { score[emo] = (score[emo]||0) + n; };

  if (kFear.some(w=>t.includes(w))) add("Takut", 3);
  if (kAnx.some(w=>t.includes(w))) add("Risau", 3);
  if (kSad.some(w=>t.includes(w))) add("Sedih", 3);
  if (kAng.some(w=>t.includes(w))) add("Marah", 3);
  if (kShm.some(w=>t.includes(w))) add("Malu", 3);

  // scenario priors
  if (scenarioKey === "bully"){ add("Malu", 2); add("Takut", 2); }
  if (scenarioKey === "exam"){ add("Risau", 2); }
  if (scenarioKey === "friend"){ add("Sedih", 2); }
  if (scenarioKey === "teacher"){ add("Takut", 2); add("Malu", 1); }
  if (scenarioKey === "family"){ add("Sedih", 1); add("Risau", 1); }

  const tone = situationTone(t);
  if (tone === "neutral" && Object.values(score).every(v=>v===0)) add("Neutral", 3);
  if (tone === "neutral") add("Neutral", 1);

  const sorted = Object.entries(score).sort((a,b)=>b[1]-a[1]);
  const out = [];
  if (sorted[0] && sorted[0][1] > 0) out.push({ emotion: sorted[0][0], score: sorted[0][1] });
  if (sorted[1] && sorted[1][1] >= 3) out.push({ emotion: sorted[1][0], score: sorted[1][1] });
  return out;
}

function needsConsistencyCheck(currentEmotion, situation){
  const eg = emotionGroup(currentEmotion);
  const st = situationTone(situation);
  const strongEmotion = (eg !== "neutral" && eg !== "unknown");
  if (strongEmotion && (st === "neutral" || st === "positive")) return true;
  if (eg === "neutral" && st === "stress") return true;
  return false;
}

// ====== Empathy narrative ======
function empathyExpandSituation(emotion, situation, scenarioKey){
  const emo = (emotion || "").trim() || "tak sedap hati";
  const sShort = shorten((situation||"").trim(), 95);
  const eg = emotionGroup(emo);

  const bodyFeel = (() => {
    if (eg === "sad") return "Bila sedih, kadang-kadang dada rasa berat dan kita rasa sunyi. Itu normal.";
    if (eg === "anx") return "Bila risau, fikiran boleh jadi laju dan badan rasa tegang/berdebar. Itu biasa.";
    if (eg === "angry") return "Bila marah, badan boleh rasa panas dan kita rasa nak melawan atau menjauh. Itu boleh difahami.";
    if (eg === "fear") return "Bila takut, badan boleh jadi kaku dan rasa nak lari. Itu normal bila rasa tak selamat.";
    if (eg === "shame") return "Bila malu, kita rasa nak sembunyi. Tapi kamu tetap berharga.";
    if (eg === "neutral") return "Kalau rasa neutral, itu pun okay—kita boleh buat versi ringkas.";
    return "Terima kasih sebab cerita—itu membantu saya faham.";
  })();

  const intro = pick([
    `Terima kasih sebab bercerita. ${reflectEmotion(emo)}`,
    `${reflectEmotion(emo)} Saya hargai kamu berkongsi.`,
    `Saya bersama kamu. ${reflectEmotion(emo)}`
  ]);

  let hypo = [];
  if (scenarioKey === "friend"){
    hypo = [
      "Bila kawan tak nak main, memang pedih sebab kita rasa macam ditolak.",
      "Kadang-kadang otak terus fikir: ‘mereka tak suka saya’ atau ‘saya tak penting’.",
      "Mungkin kamu juga rasa sunyi—betul tak?"
    ];
  } else if (scenarioKey === "bully"){
    hypo = [
      "Kalau ada orang ejek/buli, memang boleh rasa malu atau takut.",
      "Kadang-kadang otak terus fikir ‘aku sorang je’ atau ‘tiada siapa tolong’.",
      "Saya nak kamu tahu: itu bukan salah kamu."
    ];
  } else if (scenarioKey === "exam"){
    hypo = [
      "Bila pasal exam, ramai murid rasa tekanan sebab takut salah atau takut mengecewakan orang.",
      "Kadang-kadang otak terus bayang ‘kalau gagal macam mana?’ walaupun kita sedang cuba.",
      "Kamu tak keseorangan—ini sangat biasa."
    ];
  } else if (scenarioKey === "teacher"){
    hypo = [
      "Bila dimarah, kita boleh rasa takut atau rasa bersalah yang kuat.",
      "Kadang-kadang otak terus fikir ‘cikgu benci saya’, walaupun cikgu mungkin marah pada perbuatan.",
      "Kita boleh cari cara baiki pelan-pelan."
    ];
  } else if (scenarioKey === "family"){
    hypo = [
      "Bila di rumah ada tekanan, memang boleh rasa serabut dan sedih/risau.",
      "Kadang-kadang kita rasa ‘saya tak didengar’ atau ‘saya yang salah’.",
      "Terima kasih sebab berani cerita—itu bukan mudah."
    ];
  } else {
    hypo = [
      "Bila sesuatu buat kita tak selesa, otak kadang-kadang buat andaian yang menakutkan.",
      "Perasaan itu valid—kita cuba faham pelan-pelan.",
      "Kamu tak perlu tanggung sorang-sorang."
    ];
  }

  const checkIn = pick([
    "Saya tangkap macam itu—betul tak lebih kurang?",
    "Kalau saya tersalah, kamu boleh betulkan saya ya.",
    "Adakah itu hampir sama dengan apa yang kamu rasa?"
  ]);

  const extra = longMode ? pick([
    "Kita tak perlu cepat-cepat. Saya akan dengar kamu perlahan-lahan.",
    "Kamu tetap murid yang berharga walaupun sedang susah.",
    "Perasaan kamu ada sebab—dan itu penting."
  ]) : "";

  return [intro, `Situasi: "${sShort}"`, bodyFeel, pick(hypo), longMode?pick(hypo):"", extra, checkIn]
    .filter(Boolean).join("\n");
}

// ====== Safety ======
const RED_WORDS = ["bunuh","bunuh diri","nak mati","mati","cedera diri","potong","gantung","cabuli","rogol","dera","ugut bunuh"];
const ORANGE_WORDS = ["takut balik rumah","selalu kena pukul","tak boleh tidur","mimpi buruk","panic","cemas teruk","dibuli setiap hari","tak nak hidup","benci hidup"];

function safetyLevelFromText(text){
  const t = normalize(text);
  if (RED_WORDS.some(w => t.includes(w))) return "red";
  if (ORANGE_WORDS.some(w => t.includes(w))) return "orange";
  return "green";
}
function safetyResponse(level){
  if (level === "red"){
    return { tag:{kind:"danger",text:"Keselamatan dulu"}, msg: longWrap([
      "Saya risau tentang keselamatan kamu.",
      "Tolong jumpa guru / ibu bapa / penjaga atau orang dewasa dipercayai SEKARANG.",
      "Jika kecemasan, hubungi talian kecemasan tempatan."
    ])};
  }
  if (level === "orange"){
    return { tag:{kind:"warn",text:"Perlu bantuan orang dewasa"}, msg: longWrap([
      "Terima kasih kerana beritahu. Ini nampak berat untuk tanggung seorang diri.",
      "Saya cadangkan kamu bercakap dengan guru / kaunselor / ibu bapa.",
      "Jika mahu, tekan butang “Ayat untuk minta tolong”."
    ])};
  }
  return null;
}

// ====== CBT distortions ======
const DISTORTIONS = [
  { key:"all_or_nothing", name:"Hitam-putih", patterns:["mesti","selalu","tak pernah","100%","langsung","semua","tiada"] },
  { key:"catastrophizing", name:"Membesar-besarkan", patterns:["teruk sangat","habis","hancur","pasti gagal","bencana","malu besar","tak boleh"] },
  { key:"mind_reading", name:"Membaca fikiran orang", patterns:["mereka fikir","dia fikir","semua orang ketawa","semua orang benci","orang akan"] },
  { key:"labeling", name:"Melabel diri", patterns:["saya bodoh","saya teruk","saya gagal","saya lemah","saya tak berguna","saya malas"] },
  { key:"overgeneral", name:"Generalisasi melampau", patterns:["semua kali","setiap kali","biasanya saya","memang saya","sentiasa"] },
  { key:"should", name:"‘Sepatutnya’ berat", patterns:["sepatutnya","patutnya","mesti jadi"] },
];
function detectDistortion(thought){
  const t = normalize(thought);
  if (!t) return null;
  for (const d of DISTORTIONS){
    if (d.patterns.some(p => t.includes(p))) return d;
  }
  return null;
}
function reframeSuggestions(distortion, thought){
  const shortT = shorten(thought, 70);
  if (!distortion){
    return [
      "“Mungkin ada beberapa cara. Saya boleh cuba satu langkah kecil dulu.”",
      "“Saya belum boleh lagi, tapi saya sedang belajar.”",
      "“Ini susah, tapi saya boleh cuba perlahan-lahan.”"
    ];
  }
  switch(distortion.key){
    case "all_or_nothing":
      return [
        "“Tak perlu sempurna. Cukup cuba sedikit demi sedikit.”",
        "“Ada bahagian yang saya boleh buat, walaupun belum semua.”",
        `“Walaupun "${shortT}", mungkin ada jalan tengah.”`
      ];
    case "catastrophizing":
      return [
        "“Ini mungkin tidak seteruk yang otak saya bayangkan.”",
        "“Kalau jadi susah, saya masih boleh minta bantuan.”",
        "“Saya fokus apa yang boleh saya buat sekarang.”"
      ];
    case "mind_reading":
      return [
        "“Saya belum pasti apa orang fikir. Saya tak perlu teka.”",
        "“Mungkin orang lain fokus hal sendiri.”",
        "“Saya boleh bercakap dengan orang yang baik.”"
      ];
    case "labeling":
      return [
        "“Satu kesilapan tak bermakna saya teruk.”",
        "“Saya seorang murid yang sedang belajar.”",
        "“Saya boleh cuba lagi dengan cara baru.”"
      ];
    case "overgeneral":
      return [
        "“Ini satu situasi, bukan semua situasi.”",
        "“Kadang-kadang jadi, kadang-kadang tidak. Saya boleh cuba lagi.”",
        "“Saya boleh cari satu contoh yang lebih baik.”"
      ];
    case "should":
      return [
        "“Saya boleh cuba, tapi saya tak perlu tekan diri terlalu kuat.”",
        "“Saya berhak belajar perlahan-lahan.”",
        "“Saya pilih satu langkah yang realistik.”"
      ];
    default:
      return reframeSuggestions(null, thought);
  }
}

// ====== Guided coping steps (INI yang anda minta) ======
const GUIDES = {
  "Nafas 4-4-4 × 5 kali": [
    "🫁 **Nafas 4-4-4 (ulang 5 kali)**",
    "1) Tarik nafas melalui hidung **4 kiraan** (1-2-3-4).",
    "2) **Tahan 4 kiraan** (1-2-3-4).",
    "3) Hembus perlahan melalui mulut **4 kiraan** (1-2-3-4).",
    "Buat **5 pusingan**. Bahu relax. Kalau pening, buat perlahan."
  ],
  "Grounding 5-4-3-2-1": [
    "🌿 **Grounding 5-4-3-2-1** (kembali tenang)",
    "Sebut dalam hati / perlahan:",
    "5️⃣ **5 benda** yang kamu NAMPak",
    "4️⃣ **4 benda** yang kamu SENTUH (baju, meja, lantai…) ",
    "3️⃣ **3 bunyi** yang kamu DENGAR",
    "2️⃣ **2 bau** yang kamu HIDU (atau 2 benda yang kamu suka baunya)",
    "1️⃣ **1 rasa** dalam mulut (air liur/air kosong) atau 1 benda yang kamu syukur"
  ],
  "Pecahkan tugas jadi 1 langkah kecil": [
    "🧩 **Pecah tugas jadi 1 langkah (mudah buat)**",
    "1) Tulis: “Tugas saya ialah: ______”",
    "2) Pecah jadi 3 bahagian kecil: A / B / C",
    "3) Pilih yang **paling mudah** (A dahulu).",
    "4) Set masa **5 minit** sahaja.",
    "5) Lepas 5 minit, tanya: “Nak sambung 5 minit lagi atau rehat?”"
  ],
  "Tulis 3 risau → pilih 1 langkah kecil": [
    "✍️ **Tulis 3 risau → 1 langkah kecil**",
    "1) Tulis 3 perkara yang kamu risau (ringkas):",
    "   • Risau 1: ____",
    "   • Risau 2: ____",
    "   • Risau 3: ____",
    "2) Pilih **1 sahaja** yang paling ringan untuk mula.",
    "3) Tulis 1 langkah kecil: “Saya boleh buat ______ sekarang.”",
    "Contoh: “Saya boleh tanya cikgu 1 soalan.” / “Saya boleh buat 1 soalan mudah dulu.”"
  ],
  "Stop–Nafas–Pilih (1 minit)": [
    "🛑 **Stop–Nafas–Pilih (1 minit)**",
    "1) STOP: berhenti sekejap (jangan buat apa-apa 3 saat).",
    "2) NAFAS: tarik-hembus perlahan 3 kali.",
    "3) PILIH: pilih 1 tindakan baik (diam sekejap / minta rehat / bercakap sopan).",
    "Ayat bantuan: “Saya perlukan masa sekejap.”"
  ],
  "Minum air & rehat 2 minit": [
    "💧 **Minum air & rehat 2 minit**",
    "1) Minum beberapa teguk air.",
    "2) Relax bahu, lepas nafas perlahan.",
    "3) Pandang satu tempat (contoh tingkap) dan kira 20 saat.",
    "4) Bila dah ok, sambung semula langkah seterusnya."
  ],
  "Pergi tempat selamat (dekat cikgu/pejabat)": [
    "🛡️ **Pergi tempat selamat**",
    "Jika kamu rasa tak selamat:",
    "1) Bergerak ke tempat ada orang dewasa: cikgu / pejabat / pengawas.",
    "2) Berdiri dekat orang dewasa (jangan bersendirian).",
    "3) Guna ayat: “Cikgu, saya perlukan bantuan.”"
  ]
};

// ====== Toolbox options ======
const TOOLBOX = {
  Risau: [
    { label:"🫁 Nafas 4-4-4 × 5", value:"Nafas 4-4-4 × 5 kali" },
    { label:"🌿 Grounding 5-4-3-2-1", value:"Grounding 5-4-3-2-1" },
    { label:"🧩 Pecah tugas jadi 1 langkah", value:"Pecahkan tugas jadi 1 langkah kecil" },
    { label:"✍️ Tulis 3 risau → 1 langkah", value:"Tulis 3 risau → pilih 1 langkah kecil" },
    { label:"🗣️ Ayat untuk minta tolong", value:"__help_script__" }
  ],
  Marah: [
    { label:"🛑 Stop–Nafas–Pilih", value:"Stop–Nafas–Pilih (1 minit)" },
    { label:"💧 Minum air & rehat 2 minit", value:"Minum air & rehat 2 minit" },
    { label:"🌿 Grounding 5-4-3-2-1", value:"Grounding 5-4-3-2-1" },
    { label:"🗣️ Ayat untuk minta tolong", value:"__help_script__" }
  ],
  Sedih: [
    { label:"🫁 Nafas 4-4-4 × 5", value:"Nafas 4-4-4 × 5 kali" },
    { label:"🌿 Grounding 5-4-3-2-1", value:"Grounding 5-4-3-2-1" },
    { label:"💧 Minum air & rehat 2 minit", value:"Minum air & rehat 2 minit" },
    { label:"🗣️ Ayat untuk minta tolong", value:"__help_script__" }
  ],
  Takut: [
    { label:"🛡️ Pergi tempat selamat", value:"Pergi tempat selamat (dekat cikgu/pejabat)" },
    { label:"🫁 Nafas 4-4-4 × 5", value:"Nafas 4-4-4 × 5 kali" },
    { label:"🌿 Grounding 5-4-3-2-1", value:"Grounding 5-4-3-2-1" },
    { label:"🗣️ Ayat untuk minta tolong", value:"__help_script__" }
  ],
  Malu: [
    { label:"🫁 Nafas 4-4-4 × 5", value:"Nafas 4-4-4 × 5 kali" },
    { label:"🌿 Grounding 5-4-3-2-1", value:"Grounding 5-4-3-2-1" },
    { label:"💧 Minum air & rehat 2 minit", value:"Minum air & rehat 2 minit" },
    { label:"🗣️ Ayat untuk minta tolong", value:"__help_script__" }
  ],
  Neutral: [
    { label:"💧 Minum air & rehat 2 minit", value:"Minum air & rehat 2 minit" },
    { label:"🫁 Nafas 4-4-4 × 5", value:"Nafas 4-4-4 × 5 kali" }
  ]
};

function toolboxFor(emotion){
  const e = normalize(emotion);
  if (e.includes("risau")) return TOOLBOX.Risau;
  if (e.includes("marah")) return TOOLBOX.Marah;
  if (e.includes("sedih")) return TOOLBOX.Sedih;
  if (e.includes("takut")) return TOOLBOX.Takut;
  if (e.includes("malu")) return TOOLBOX.Malu;
  return TOOLBOX.Neutral;
}

// ====== Scenarios ======
const SCENARIOS = {
  exam: { name:"Peperiksaan / Kerja Sekolah", example:"Saya risau bila exam sebab takut salah banyak.", thoughtOptions:[
    "Saya mesti dapat A, kalau tak saya gagal.",
    "Saya akan lupa semua.",
    "Saya memang tak pandai.",
    "Saya akan kecewakan cikgu/ibu bapa."
  ]},
  bully: { name:"Buli / Diejek", example:"Saya malu/takut sebab ada orang ejek saya.", thoughtOptions:[
    "Mereka semua ketawakan saya.",
    "Saya tak selamat di sekolah.",
    "Tak ada siapa akan tolong.",
    "Ini salah saya."
  ]},
  friend:{ name:"Kawan / Bergaduh", example:"Saya sedih sebab kawan tak nak main dengan saya.", thoughtOptions:[
    "Mereka tak suka saya.",
    "Saya tak penting.",
    "Saya tak ada kawan.",
    "Saya akan keseorangan."
  ]},
  teacher:{ name:"Dimarah Cikgu", example:"Saya takut bila cikgu marah saya.", thoughtOptions:[
    "Cikgu benci saya.",
    "Saya budak nakal.",
    "Saya memang teruk."
  ]},
  family:{ name:"Keluarga / Di rumah", example:"Saya sedih/risau di rumah sebab dimarah.", thoughtOptions:[
    "Ini semua salah saya.",
    "Mereka tak sayang saya.",
    "Saya tak berguna."
  ]},
  other:{ name:"Lain-lain", example:"Saya rasa risau tentang sesuatu di sekolah.", thoughtOptions:[
    "Saya tak cukup bagus.",
    "Semua akan jadi teruk.",
    "Saya tak boleh buat apa-apa."
  ]}
};

// ====== State / Steps ======
/*
0 pilih scenario
1 emosi
2 intensity (0-10)
3 calming if high intensity (>=8)
4 situasi + semak emosi (detect emosi dari situasi)
5 fikiran
6 fikiran baru
7 tindakan + panduan langkah + summary
*/
const STEPS_TOTAL = 7;
let state;

function resetState(){
  state = {
    step: 0,
    studentId: "",
    scenarioKey: null,
    scenarioName: "",
    emotion: "",
    intensity: 0,
    situation: "",
    thought: "",
    distortion: null,
    newThought: "",
    action: ""
  };
}

// ====== UI ======
function setOptions(title, options){
  optionsTitle.textContent = title || "Pilih jawapan (atau taip):";
  optionsEl.innerHTML = "";
  (options || []).forEach(opt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "optBtn";
    btn.textContent = opt.label;
    btn.addEventListener("click", () => handleUserInput(opt.value ?? opt.label));
    optionsEl.appendChild(btn);
  });
}
function clearOptions(){ optionsEl.innerHTML = ""; }
function setProgress(step){
  const s = clamp(step, 0, STEPS_TOTAL);
  stepPill.textContent = `Langkah: ${s}/${STEPS_TOTAL}`;
  progressBar.style.width = `${(s / STEPS_TOTAL) * 100}%`;
}
function setModeUI(){
  const theme = document.body.classList.contains("dark") ? "Gelap" : "Ceria";
  modePill.textContent = `Mode: ${kioskMode ? "Kiosk" : "Normal"} • ${longMode ? "Mendalam" : "Ringkas"} • Tema: ${theme}`;
  hintPill.textContent = kioskMode ? "Tip: guna butang" : "Tip: boleh taip";
}

// ====== Theme / TTS ======
function applyTheme(){
  document.body.classList.toggle("dark", !!themeToggle?.checked);
  setModeUI();
}
function applyTTS(){
  ttsEnabled = !!ttsToggle?.checked;
  // jika browser tak support, auto off
  if (ttsEnabled && !canTTS()){
    ttsEnabled = false;
    ttsToggle.checked = false;
    addMsg("Maaf, browser ini tidak menyokong suara. Cuba Chrome/Edge ya.", "bot", {kind:"warn", text:"Suara"});
  }
}

// ====== Help Script ======
async function showHelpScript(){
  addMsg("Saya nak ayat untuk minta tolong", "user");
  await botSay(
    longWrap([
      "Baik. Ini ayat pendek yang kamu boleh guna (pilih satu):",
      "1) “Cikgu, saya rasa tak selamat / takut. Saya perlukan bantuan.”",
      "2) “Cikgu, saya dibuli / diejek. Boleh tolong saya?”",
      "3) “Saya rasa sangat sedih/risau. Saya nak bercakap sekejap.”",
      "",
      "Kalau kamu mahu, kamu boleh tunjuk ayat ini pada cikgu."
    ]),
    { kind:"warn", text:"Ayat bantuan" }
  );
  setOptions("Lepas itu:", [
    { label:"✅ Saya akan beritahu cikgu", value:"__ack__" },
    { label:"🔄 Mula semula", value:"__restart__" }
  ]);
}

// ====== Guided action ======
async function runGuide(actionValue){
  const lines = GUIDES[actionValue];
  if (!lines) return false;

  await botSay(lines.join("\n"), { kind:"info", text:"Panduan langkah" });

  setOptions("Dah siap buat? (pilih satu)", [
    { label:"✅ Ya, saya sudah buat", value:"__done_action__" },
    { label:"🔁 Ulang panduan", value:"__repeat_action__" },
    { label:"🗣️ Saya perlukan bantuan orang dewasa", value:"__help_script__" }
  ]);
  return true;
}

// ====== Start / Scenario ======
function showScenarioPrompt(){
  scenarioArea.style.display = "block";
  setOptions("Tip: pilih satu situasi di atas untuk mula.", [
    { label:"Saya nak mula tanpa pilih", value:"__skip_scenario__" }
  ]);
  setProgress(0);
}

async function scenarioSelect(key){
  const scn = SCENARIOS[key] || SCENARIOS.other;
  state.scenarioKey = key;
  state.scenarioName = scn.name;
  scenarioArea.style.display = "none";

  addMsg(`Saya pilih: ${scn.name}`, "user");
  state.step = 1;
  setProgress(1);

  await botSay(
    longWrap([
      "Baik. Terima kasih sebab pilih situasi—itu membantu saya faham kamu.",
      praiseSmall(),
      `Untuk situasi "${scn.name}", kita akan buat langkah CBT yang mudah dan selamat.`,
      "Emosi kamu sekarang apa?"
    ]),
    { kind:"info", text:"Mula" }
  );

  setOptions("Pilih emosi:", [
    { label:"😟 Risau", value:"Risau" },
    { label:"😡 Marah", value:"Marah" },
    { label:"😢 Sedih", value:"Sedih" },
    { label:"😨 Takut", value:"Takut" },
    { label:"😳 Malu", value:"Malu" },
    { label:"😐 Neutral / biasa-biasa", value:"Neutral" },
    { label:"😐 Tak pasti", value:"Tak pasti" },
  ]);
}

async function start(){
  chat.innerHTML = "";
  resetState();

  kioskMode = !!kioskToggle?.checked;
  longMode = kioskMode ? false : !!longToggle?.checked; // kiosk auto ringkas
  applyTheme();
  applyTTS();
  setModeUI();
  setProgress(0);

  await botSay(
    longWrap([
      "Hai 😊 Saya di sini untuk dengar kamu.",
      "Kamu penting, dan perasaan kamu juga penting.",
      "Pilih situasi untuk mula ya."
    ]),
    { kind:"ok", text:"Selamat datang" }
  );

  showScenarioPrompt();
}

// ====== Proceed to Thought ======
async function proceedToThought(){
  const scn = SCENARIOS[state.scenarioKey] || SCENARIOS.other;
  state.step = 5;
  setProgress(5);

  await botSay(
    longWrap([
      praiseSmall(),
      empathyExpandSituation(state.emotion, state.situation, state.scenarioKey),
      "",
      "Bila itu berlaku, apa fikiran yang paling kuat muncul dalam kepala kamu?",
      "Kalau susah nak jawab, boleh pilih dari pilihan di bawah."
    ]),
    { kind:"info", text:"Fikiran" }
  );

  const list = (scn.thoughtOptions || []).slice(0, 6).map(x => ({ label:x, value:x }));
  setOptions("Pilih fikiran (atau taip sendiri):", [
    ...list,
    { label:"Saya tak pasti", value:"tak pasti" }
  ]);
}

// ====== Main Handler ======
async function handleUserInput(text){
  const raw = (text || "").trim();
  if (!raw) return;

  kioskMode = !!kioskToggle?.checked;
  longMode = kioskMode ? false : !!longToggle?.checked;
  ttsEnabled = !!ttsToggle?.checked;
  setModeUI();

  state.studentId = (studentIdEl?.value || "").trim();

  // special commands
  if (raw === "__restart__"){ await start(); return; }
  if (raw === "__skip_scenario__"){ await scenarioSelect("other"); return; }
  if (raw === "__help_script__"){ await showHelpScript(); return; }
  if (raw === "__ack__"){
    addMsg("OK", "user");
    await botSay(longWrap([
      "Terima kasih. Kamu sangat berani kerana minta bantuan. 🌟",
      "Kalau nak, kita boleh mula semula. Saya ada di sini."
    ]), { kind:"ok", text:"Bagus" });
    setOptions("Pilihan:", [{ label:"🔄 Mula semula", value:"__restart__" }]);
    return;
  }
  if (raw === "__done_action__"){
    addMsg("Saya sudah buat ✅", "user");
    await botSay("Bagus! Kamu baru buat satu langkah yang sihat untuk diri kamu. 🌟", {kind:"ok", text:"Hebat"});
    showSummary();
    return;
  }
  if (raw === "__repeat_action__"){
    addMsg("Ulang panduan", "user");
    // ulang guide ikut action terakhir
    const did = await runGuide(state.action);
    if (!did) await botSay("Baik. Kita boleh pilih tindakan lain.", {kind:"info", text:"Pilihan"});
    return;
  }

  // Safety scan
  const lvl = safetyLevelFromText(raw);
  if (lvl !== "green"){
    addMsg(raw, "user");
    const s = safetyResponse(lvl);
    if (s){
      await botSay(s.msg, s.tag, 250);
      setOptions("Pilihan:", [
        { label:"🗣️ Ayat untuk minta tolong", value:"__help_script__" },
        { label:"🔄 Mula semula", value:"__restart__" }
      ]);
    }
    return;
  }

  // normal input
  addMsg(raw, "user");
  const scn = SCENARIOS[state.scenarioKey] || SCENARIOS.other;

  // Step 1: emotion
  if (state.step === 1){
    state.emotion = raw;
    state.step = 2;
    setProgress(2);

    await botSay(longWrap([
      reflectEmotion(state.emotion),
      validateEmotion(state.emotion),
      gentleBridge(),
      "Kalau 0 sampai 10, kuat mana perasaan itu sekarang? (0=tak kuat, 10=sangat kuat)"
    ]), { kind:"info", text:"Skala" });

    setOptions("Pilih nombor:", [
      {label:"2", value:"2"}, {label:"4", value:"4"}, {label:"6", value:"6"},
      {label:"8", value:"8"}, {label:"10", value:"10"},
      {label:"Saya nak taip sendiri", value:"7"}
    ]);
    return;
  }

  // Step 2: intensity
  if (state.step === 2){
    let n = isNumberLike(raw) ? Number(raw) : 6;
    n = clamp(n, 0, 10);
    state.intensity = n;

    if (n >= 8){
      state.step = 3;
      setProgress(3);
      const tb = toolboxFor(state.emotion);

      await botSay(longWrap([
        `Baik. Kekuatan emosi kamu ${n}/10—itu memang kuat.`,
        "Bila emosi kuat, kita tolong badan tenang dulu (baru senang berfikir).",
        "Pilih satu cara cepat sekarang:"
      ]), { kind:"warn", text:"Tenang dulu" });

      setOptions("Pilih satu (30–60 saat):", tb.slice(0,5));
      return;
    }

    state.step = 4;
    setProgress(4);

    await botSay(longWrap([
      `Baik. Kekuatan emosi kamu ${n}/10.`,
      praiseSmall(),
      "Sekarang, apa yang berlaku? Cerita ringkas."
    ]), { kind:"info", text:"Situasi" });

    setOptions("Contoh jawapan:", [
      { label: scn.example, value: scn.example },
      { label:"Saya rasa biasa-biasa sahaja.", value:"saya rasa biasa-biasa sahaja" },
      { label:"Saya tak tahu nak cerita.", value:"tak tahu" }
    ]);
    return;
  }

  // Step 3: calming first
  if (state.step === 3){
    // treat input as calming action name; store and show guide if available
    state.action = raw;

    const guided = await runGuide(state.action);
    if (guided) return;

    // if not guided, continue to situation
    state.step = 4;
    setProgress(4);

    await botSay("Baik. Sekarang cerita ringkas apa yang berlaku.", {kind:"info", text:"Situasi"});
    setOptions("Contoh jawapan:", [
      { label: scn.example, value: scn.example },
      { label:"Saya rasa biasa-biasa sahaja.", value:"saya rasa biasa-biasa sahaja" },
      { label:"Saya tak tahu nak cerita.", value:"tak tahu" }
    ]);
    return;
  }

  // Step 4: situation + detect emosi
  if (state.step === 4){
    if (handleIDontKnow(raw)){
      await botSay("Tak apa. Pilih satu ayat yang paling dekat.", {kind:"info", text:"Tak apa"});
      setOptions("Pilih satu:", [
        { label:"Saya sedih sebab kawan tak nak main.", value:"Saya sedih sebab kawan tak nak main dengan saya." },
        { label:"Saya malu sebab diejek.", value:"Saya malu sebab diejek." },
        { label:"Saya risau sebab exam.", value:"Saya risau sebab exam." },
        { label:"Saya takut dimarah.", value:"Saya takut dimarah." }
      ]);
      return;
    }

    state.situation = raw;

    // detect 1–2 emotions from situation
    const detected = detectEmotionsFromSituation(state.situation, state.scenarioKey).map(x=>x.emotion);
    const current = state.emotion || "Neutral";
    const currentG = emotionGroup(current);
    const suggested = detected.filter(Boolean);
    const suggestNeeded = suggested[0] && emotionGroup(suggested[0]) !== "unknown" && emotionGroup(suggested[0]) !== currentG;

    if (needsConsistencyCheck(current, state.situation) || suggestNeeded){
      const msg = longWrap([
        "Saya nak semak sekejap supaya saya tak tersalah faham 🙂",
        `Ayat situasi: “${shorten(state.situation, 80)}”`,
        suggested.length ? `Emosi yang mungkin dekat: ${suggested.join(" + ")}.` : "Saya nampak emosi & ayat mungkin tak selari.",
        `Emosi asal kamu: "${current}".`,
        "Yang paling tepat sekarang, kamu rasa macam mana?"
      ]);
      await botSay(msg, {kind:"info", text:"Semak emosi"});

      const opts = [
        { label:`✅ Kekal: ${current}`, value: current }
      ];
      suggested.forEach(e => opts.push({ label:`⭐ Tukar: ${e}`, value: e }));
      opts.push(
        { label:"😟 Risau", value:"Risau" },
        { label:"😡 Marah", value:"Marah" },
        { label:"😢 Sedih", value:"Sedih" },
        { label:"😨 Takut", value:"Takut" },
        { label:"😳 Malu", value:"Malu" },
        { label:"😐 Neutral", value:"Neutral" }
      );

      // Set emotion then proceed
      setOptions("Pilih satu:", opts.map(o => ({
        label: o.label,
        value: "__set_emotion__" + o.value
      })));
      return;
    }

    await proceedToThought();
    return;
  }

  // handle emotion set from options
  if (raw.startsWith("__set_emotion__")){
    const emo = raw.replace("__set_emotion__", "").trim();
    state.emotion = emo || state.emotion;
    await proceedToThought();
    return;
  }

  // Step 5: thought
  if (state.step === 5){
    if (handleIDontKnow(raw)){
      await botSay("Tak apa. Pilih satu fikiran yang paling dekat.", {kind:"info", text:"Pelan-pelan"});
      setOptions("Pilih satu:", [
        { label:"Saya tak cukup bagus.", value:"Saya tak cukup bagus." },
        { label:"Semua orang akan ketawakan saya.", value:"Semua orang akan ketawakan saya." },
        { label:"Saya pasti gagal.", value:"Saya pasti gagal." },
        { label:"Tak ada siapa akan tolong.", value:"Tak ada siapa akan tolong." }
      ]);
      return;
    }

    state.thought = raw;
    state.distortion = detectDistortion(state.thought);
    state.step = 6;
    setProgress(6);

    const hints = reframeSuggestions(state.distortion, state.thought);

    await botSay(longWrap([
      `Saya dengar fikiran kamu: "${shorten(state.thought, 75)}"`,
      state.distortion ? `Ini nampak macam corak "${state.distortion.name}".` : "Terima kasih sebab jujur.",
      "Pilih satu fikiran baru yang lebih adil dan lembut:"
    ]), {kind:"info", text:"Fikiran baru"});

    setOptions("Cadangan fikiran baru:", [
      { label:`🌤️ ${hints[0]}`, value:hints[0] },
      { label:`🌤️ ${hints[1]}`, value:hints[1] },
      { label:`🌤️ ${hints[2]}`, value:hints[2] },
      { label:"Saya nak taip sendiri", value:"Saya boleh cuba perlahan-lahan, satu langkah dulu." }
    ]);
    return;
  }

  // Step 6: new thought -> actions (guided!)
  if (state.step === 6){
    state.newThought = raw;
    state.step = 7;
    setProgress(7);

    const tb = toolboxFor(state.emotion);

    await botSay(longWrap([
      "Saya suka cara kamu pilih fikiran baru itu. 🌈",
      `"${shorten(state.newThought, 90)}"`,
      "Sekarang pilih 1 tindakan kecil. Saya akan ajar langkahnya."
    ]), {kind:"info", text:"Tindakan"});

    setOptions("Pilih satu:", tb);
    return;
  }

  // Step 7: action -> run guide -> summary
  if (state.step === 7){
    state.action = raw;

    // if it's help script
    if (raw === "__help_script__"){ await showHelpScript(); return; }

    const guided = await runGuide(state.action);
    if (!guided){
      // if no guide, just confirm and show summary
      await botSay("Baik. Terima kasih—itu satu tindakan yang bagus. ✅", {kind:"ok", text:"Siap"});
      showSummary();
    }
    return;
  }
}

// ====== Summary ======
function showSummary(){
  clearOptions();
  const sid = state.studentId ? `Kod Murid: ${state.studentId}\n` : "";
  const dist = state.distortion ? `Corak fikiran: ${state.distortion.name}\n` : "";

  const summary = longWrap([
    sid + `Situasi: ${state.scenarioName || "-"}`,
    `Emosi: ${state.emotion || "-"} (Kekuatan: ${state.intensity || "-"} /10)`,
    `Apa berlaku: ${state.situation || "-"}`,
    `Fikiran asal: ${state.thought || "-"}`,
    dist ? dist.trim() : "",
    `Fikiran baru: ${state.newThought || "-"}`,
    `Tindakan: ${state.action || "-"}`,
    "",
    "Nota mesra: Kamu penting. Kamu sudah buat langkah yang berani hari ini. 🌟",
    "Nota keselamatan: Ini alat sokongan (bukan diagnosis). Jika ada bahaya, jumpa orang dewasa dipercayai segera."
  ]);

  summaryContent.textContent = summary;
  summaryModal.classList.remove("hidden");
  newStudent.textContent = kioskMode ? "Sesi Murid Seterusnya" : "Mula Semula";
}

function closeSummaryModal(){ summaryModal.classList.add("hidden"); }
function copyText(text){ navigator.clipboard?.writeText(text).catch(() => {}); }

// ====== Events ======
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await handleUserInput(input.value);
  input.value = "";
  input.focus();
});

resetBtn.addEventListener("click", start);

kioskToggle?.addEventListener("change", () => {
  kioskMode = kioskToggle.checked;
  if (kioskMode && longToggle) longToggle.checked = false;
  start();
});

longToggle?.addEventListener("change", () => {
  longMode = !!longToggle.checked;
  setModeUI();
});

themeToggle?.addEventListener("change", applyTheme);
ttsToggle?.addEventListener("change", applyTTS);

document.querySelectorAll(".cardBtn").forEach(btn => {
  btn.addEventListener("click", () => scenarioSelect(btn.dataset.scn));
});

closeSummary.addEventListener("click", closeSummaryModal);

copySummary.addEventListener("click", () => {
  copyText(summaryContent.textContent);
  addMsg("Ringkasan telah di-copy ✅", "bot", { kind:"ok", text:"Siap" });
});

newStudent.addEventListener("click", () => {
  closeSummaryModal();
  if (kioskMode && studentIdEl) studentIdEl.value = "";
  start();
});

// Start
resetState();
applyTheme();
applyTTS();
start();