import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "posts.db"));

const clients = [
  {
    id: "cpolar",
    name: "C-POLAR Technologies",
    tagline: "Ambient Protection™ for modern life.",
    color: "#91BC07",
    timezone: "EST",
    audience: "Facility managers, public health officials, enterprise buyers, health-conscious consumers, investors",
    voice: "Quietly confident. We never shout, never scare, never overexplain. Warm but precise — human, never clinical. Smart, never cold. Elevated, not trendy. Reassuring, not alarmist. We talk about better living, not threats. State facts simply and let them stand. Our audience is discerning, curious, and values quality.",
    posting_days: JSON.stringify(["Tuesday","Wednesday","Thursday","Friday"]),
    best_post_times: JSON.stringify({
      Tuesday: "9:00 AM EST",
      Wednesday: "10:00 AM EST",
      Thursday: "9:00 AM EST",
      Friday: "3:00 PM EST",
    }),
    brand: {
      palette: JSON.stringify(["#91BC07","#2B2B2B","#F0F0F0","#DCD8CF","#837F7A","#FFFFFF"]),
      visual_mood: "Soft neutral stone and grey backgrounds. Bold white or near-black headline text. Lime green #91BC07 used on 2-3 key words only — never as background. Clean, quiet, never alarming.",
      logo_text: "C-POLAR™",
      accent_color: "#91BC07",
      dark_color: "#2B2B2B",
      light_color: "#F0F0F0",
      key_phrases: JSON.stringify(["Ambient Protection™","NanoFlashing™","Built in. Always on.","Protection should not depend on behavior.","The environments around us shape our health."]),
      badges: JSON.stringify(["Ambient Protection™","NanoFlashing™","Air filtration","Water","Medical devices","PPE","ReinFire™","Inhalo™"]),
    },
    pillars: [
      { day: "Tuesday",   type: "Science insight",  color: "#91BC07", example: "How NanoFlashing™ creates a permanent positive electrostatic charge that eliminates bacteria, viruses, and fungi on contact — no chemicals, no electricity, no maintenance.", sort_order: 0 },
      { day: "Wednesday", type: "Human story",       color: "#837F7A", example: "The BGIS senior director who ran C-POLAR for 3 months: what the data showed, what changed, what surprised him.", sort_order: 1 },
      { day: "Thursday",  type: "Industry POV",      color: "#2B2B2B", example: "We spend 90% of our lives indoors. Protection that depends on behavior, compliance, or vigilance will always fail. It's time to build it in.", sort_order: 2 },
      { day: "Friday",    type: "Proof & traction",  color: "#91BC07", example: "Harvard's Dr. Michael Mansour: C-POLAR is 'an essential interrupter of infectious spread.' What peer-reviewed independent validation means for scale.", sort_order: 3 },
    ],
  },
  {
    id: "oxia",
    name: "Oxia Therapeutics",
    tagline: "The end of irreversible damage.",
    color: "#2BBFB0",
    timezone: "EST",
    audience: "Biotech investors, regenerative medicine researchers, clinicians, cardiovascular/renal specialists, healthcare systems",
    voice: "Visionary yet precise. Blends profound hope with hard preclinical data. References 30 years of Baylor science as credibility anchor. Never hypes — always grounds bold claims in evidence. Tone: the quiet confidence of people who have the data and know what it means.",
    posting_days: JSON.stringify(["Tuesday","Wednesday","Thursday","Friday"]),
    best_post_times: JSON.stringify({
      Tuesday: "8:15 AM EST",
      Wednesday: "9:00 AM EST",
      Thursday: "9:30 AM EST",
      Friday: "9:00 AM EST",
    }),
    brand: {
      palette: JSON.stringify(["#2BBFB0","#1A3D4F","#E8504A","#F5F2EE","#FFFFFF","#2A6B7C"]),
      visual_mood: "ALWAYS use deep navy #1A3D4F as the primary background. Gradient from #1A3D4F to #0d2233. Wide-tracked headline caps in white. Teal #2BBFB0 on borders and geometric accents. Coral #E8504A on 2-3 power words only. Every word must be white.",
      logo_text: "OXIA",
      accent_color: "#2BBFB0",
      dark_color: "#1A3D4F",
      light_color: "#F5F2EE",
      key_phrases: JSON.stringify(["The end of irreversible damage.","We don't need to replace biology. We need to turn it back on.","Aging isn't programmed. It's what happens when repair fails.","Not managing decline. Reversing it."]),
      badges: JSON.stringify(["ERM Therapies™","SRC biology","Cellular repair","Stroke","Kidney injury","Myocardial infarction","Gorlin Immuno-Longevity","$75M raise"]),
    },
    pillars: [
      { day: "Tuesday",   type: "Science insight",  color: "#2BBFB0", example: "What are Steroid Receptor Coactivators? The master regulators of cellular repair that Oxia's ERM platform activates — and why targeting the control point changes everything.", sort_order: 0 },
      { day: "Wednesday", type: "Human story",       color: "#1A3D4F", example: "Inside Dr. Lisa McClendon's lab at Baylor: what a day of cellular repair discovery actually looks like, and the moment the data changed everything.", sort_order: 1 },
      { day: "Thursday",  type: "Industry POV",      color: "#2BBFB0", example: "We extended lifespan for 100 years. Now we've hit a ceiling. Medicine got better at keeping people alive. It didn't get better at keeping them well.", sort_order: 2 },
      { day: "Friday",    type: "Proof & data",      color: "#E8504A", example: "78% reduction in fibrosis. Preserved organ function. Blood vessel regeneration. Cells survive at 1% oxygen. The preclinical data that changes what we thought possible.", sort_order: 3 },
    ],
  },
  {
    id: "coregen",
    name: "CoRegen",
    tagline: "The future of cancer eradication therapy.",
    color: "#E8181A",
    timezone: "EST",
    audience: "Oncology researchers, immuno-oncology community, biotech investors, cancer patient advocates, pharma partners",
    voice: "Urgent and historic. Speaks with the full confidence of nearly 50 years of foundational science. Backs every bold claim with data — complete tumour eradication in 400+ mice, 7 cancer types, zero recurrence, zero toxicity. Never tentative.",
    posting_days: JSON.stringify(["Tuesday","Wednesday","Thursday","Friday"]),
    best_post_times: JSON.stringify({
      Tuesday: "8:00 AM EST",
      Wednesday: "8:30 AM EST",
      Thursday: "10:00 AM EST",
      Friday: "12:00 PM EST",
    }),
    brand: {
      palette: JSON.stringify(["#E8181A","#0D0D1A","#1A1A3E","#FFFFFF","#F5F5F7","#2A2A4A"]),
      visual_mood: "Near-black #0D0D1A and deep navy #1A1A3E backgrounds dominate. ALL TEXT WHITE. Bold condensed sans-serif headlines at large scale. Red #E8181A ONLY on the 2-3 most important words — never as background. Cinematic, dark, urgent, historic.",
      logo_text: "CoRegen",
      accent_color: "#E8181A",
      dark_color: "#0D0D1A",
      light_color: "#F5F5F7",
      key_phrases: JSON.stringify(["The future of cancer eradication therapy.","We can change this.","CoRegen's technology has the potential to make cancer obsolete.","Groundbreaking. Disruptive. Scalable. Accessible."]),
      badges: JSON.stringify(["SRC-3 KO Tregs","CRG-150","Glioblastoma","TNBC","Pancreatic","Prostate","No toxicity","PNAS Cozzarelli Prize 2023","Baylor College of Medicine","Phase 1 2026"]),
    },
    pillars: [
      { day: "Tuesday",   type: "Science insight",  color: "#E8181A", example: "1 gene. Out of 22,000. In 1 cell type. Out of 200. That's what CoRegen identified. Knock out SRC-3 in Treg cells and cancer loses its ability to hide from the immune system — permanently.", sort_order: 0 },
      { day: "Wednesday", type: "Human story",       color: "#2A2A4A", example: "Nearly 50 years of molecular research. Dr. Bert O'Malley's journey from discovering how hormones work to the science that may eradicate cancer.", sort_order: 1 },
      { day: "Thursday",  type: "Industry POV",      color: "#E8181A", example: "Every major cancer therapy for 50 years has been toxic. The side effects are considered acceptable because there was no alternative. CoRegen is the alternative.", sort_order: 2 },
      { day: "Friday",    type: "Proof & science",   color: "#E8181A", example: "Complete tumour eradication. No recurrence. No toxicity. 7 cancer types. 400+ mice. Published in PNAS. Winner of the 2023 Cozzarelli Prize.", sort_order: 3 },
    ],
  },
  {
    id: "intrepro",
    name: "IntrePro + Klim-Loc",
    tagline: "The smart medtech company. Built to eliminate the needle.",
    color: "#2BBFB0",
    timezone: "EST",
    audience: "Hospital procurement, infection control professionals, pharma manufacturing, DoD/military medicine, med-device investors",
    voice: "Precise and credible. Clinical in tone but genuinely accessible. Bridges materials science and patient safety without oversimplifying. Pragmatic, problem-solver energy. Never academic.",
    posting_days: JSON.stringify(["Monday","Wednesday","Friday","Saturday"]),
    best_post_times: JSON.stringify({
      Monday: "8:30 AM EST",
      Wednesday: "12:00 PM EST",
      Friday: "8:00 AM EST",
      Saturday: "10:00 AM EST",
    }),
    brand: {
      palette: JSON.stringify(["#2BBFB0","#1A3A38","#FFFFFF","#EAF8F7","#2A5A55","#00A896"]),
      visual_mood: "Dark teal #1A3A38 to near-black gradient backgrounds. ALL TEXT WHITE. Teal #2BBFB0 as dominant accent on key words, borders and icons. Clinical but accessible. Projects competence and innovation simultaneously.",
      logo_text: "KLIM-LOC",
      accent_color: "#2BBFB0",
      dark_color: "#1A3A38",
      light_color: "#EAF8F7",
      key_phrases: JSON.stringify(["The smart medtech company.","Needles are simply outdated, unsafe, and unnecessary for most applications.","Redesign the pharmaceutical vial cap.","$1 billion in annual needlestick injury costs. We're solving it."]),
      badges: JSON.stringify(["Needleless vial cap","3 patents filed","Antimicrobial polymer","Sensor technology","Pharmapack Europe 2024 award","DoD / BARDA consortia","Baxter interest","Product launch 2026"]),
    },
    pillars: [
      { day: "Monday",    type: "Science insight",  color: "#2BBFB0", example: "A single vial cap redesign eliminates the needle from the medication workflow entirely — and with it, the contamination risk, the sharps waste, and the injury cost. Here's how.", sort_order: 0 },
      { day: "Wednesday", type: "Human story",       color: "#1A3A38", example: "Robbie Klimek: 20 years as a certified flight paramedic. One problem he watched injure colleagues every day. One patented solution that's now heading to market in 2026.", sort_order: 1 },
      { day: "Friday",    type: "Industry POV",      color: "#2BBFB0", example: "Needlestick injuries cost US healthcare $1 billion annually. 385,000 healthcare workers are injured every year. The needle is the problem. We built the replacement.", sort_order: 2 },
      { day: "Saturday",  type: "Proof & pipeline",  color: "#1A3A38", example: "Pharmapack Europe 2024 award. DoD consortia. Baxter, Gerresheimer, Medline interest. Three patents. Working prototype. Klim-Loc launches in 2026.", sort_order: 3 },
    ],
  },
  {
    id: "senvi",
    name: "Senvi",
    tagline: "Removing what aging leaves behind.",
    color: "#2BBFB3",
    timezone: "PST",
    audience: "Longevity researchers, oncologists, biotech investors, aging-science community, pharma partners, cancer recovery specialists",
    voice: "Precise, forward-looking, quietly confident. Sits at the intersection of longevity science and oncology. Technically grounded without being jargony. Focused on what the body can do once the burden is removed.",
    posting_days: JSON.stringify(["Tuesday","Wednesday","Thursday","Friday"]),
    best_post_times: JSON.stringify({
      Tuesday: "9:00 AM PST",
      Wednesday: "8:30 AM PST",
      Thursday: "9:30 AM PST",
      Friday: "9:00 AM PST",
    }),
    brand: {
      palette: JSON.stringify(["#2BBFB3","#0A2A28","#FFFFFF","#E0F9F7","#1A8A84","#000D0C"]),
      visual_mood: "Dark near-black #0A2A28 to teal #2BBFB3 gradient backgrounds. Huge display typography. White headlines. Molecular/cellular geometry in teal tones as decorative background elements. Always elegant — between a Nature paper and a TED talk.",
      logo_text: "senvi",
      accent_color: "#2BBFB3",
      dark_color: "#0A2A28",
      light_color: "#E0F9F7",
      key_phrases: JSON.stringify(["Removing what aging leaves behind.","Making ineffective treatments effective.","SenC eliminates senescent cells. In 7 days.","Complete tumour elimination in combination."]),
      badges: JSON.stringify(["SenC peptide","Senescent cell clearance","Cancer therapy","Cancer recovery","Chronic disease","Increased healthspan","Provisional patent Nov 2024","First-in-class","Gorlin Immuno-Longevity"]),
    },
    pillars: [
      { day: "Tuesday",   type: "Science insight",  color: "#2BBFB3", example: "What are senescent cells? They stop dividing but stay metabolically active, releasing inflammatory signals that drive cancer, aging, and chronic disease. And until now, nothing could reliably remove them.", sort_order: 0 },
      { day: "Wednesday", type: "Human story",       color: "#0A2A28", example: "The scientist behind Senvi's SenC peptide: why they focused on senescence when everyone else chased different aging targets — and what the early data showed that made them certain.", sort_order: 1 },
      { day: "Thursday",  type: "Industry POV",      color: "#2BBFB3", example: "Chemotherapy saves lives. It also accelerates biological aging by creating a surge of senescent cells the body can't clear. That burden is a problem medicine has barely begun to address.", sort_order: 2 },
      { day: "Friday",    type: "Proof & direction", color: "#1A8A84", example: "Complete tumour elimination in 7 days in combination. 70% reduction in senescent signal after one dose. >50% reduction in senescent cells in aged mice.", sort_order: 3 },
    ],
  },
];

// ── Run the seed ─────────────────────────────────────────────────────────────
const insertClient = db.prepare(`
  INSERT OR IGNORE INTO clients
    (id, name, tagline, color, timezone, audience, voice, posting_days, best_post_times)
  VALUES
    (@id, @name, @tagline, @color, @timezone, @audience, @voice, @posting_days, @best_post_times)
`);

const insertBrandKit = db.prepare(`
  INSERT OR IGNORE INTO brand_kits
    (client_id, palette, visual_mood, logo_text, accent_color, dark_color, light_color, key_phrases, badges)
  VALUES
    (@client_id, @palette, @visual_mood, @logo_text, @accent_color, @dark_color, @light_color, @key_phrases, @badges)
`);

const insertPillar = db.prepare(`
  INSERT OR IGNORE INTO pillars
    (client_id, day, type, color, example, sort_order)
  VALUES
    (@client_id, @day, @type, @color, @example, @sort_order)
`);

const seedAll = db.transaction(() => {
  for (const client of clients) {
    insertClient.run({
      id: client.id,
      name: client.name,
      tagline: client.tagline,
      color: client.color,
      timezone: client.timezone,
      audience: client.audience,
      voice: client.voice,
      posting_days: client.posting_days,
      best_post_times: client.best_post_times,
    });

    insertBrandKit.run({
      client_id: client.id,
      ...client.brand,
    });

    for (const pillar of client.pillars) {
      insertPillar.run({
        client_id: client.id,
        ...pillar,
      });
    }
  }
});

seedAll();
console.log("✅ Seeded 5 clients with brand kits and pillars.");
db.close();