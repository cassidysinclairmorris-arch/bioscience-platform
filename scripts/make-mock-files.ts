// Generates the placeholder files the C-POLAR demo asset library points at, so
// every card in the portal library has a real file behind its Download link.
// Writes to public/files/cpolar-demo/. Safe to re-run.
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const OUT = join(process.cwd(), "public", "files", "cpolar-demo");

// A single-page PDF with a title and a couple of lines of body text. Offsets in
// the xref table have to be byte-exact, so the objects are assembled in order
// and each start position is recorded as we go.
function buildPdf(title: string, lines: string[]): Buffer {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const body = [
    "BT /F1 22 Tf 62 700 Td (" + esc(title) + ") Tj ET",
    ...lines.map((l, i) => `BT /F1 12 Tf 62 ${656 - i * 20} Td (${esc(l)}) Tj ET`),
  ].join("\n");

  const objects = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>",
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
    `<</Length ${Buffer.byteLength(body)}>>\nstream\n${body}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });

  const xrefAt = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(o => { pdf += String(o).padStart(10, "0") + " 00000 n \n"; });
  pdf += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

const DOCS: { file: string; title: string; lines: string[] }[] = [
  {
    file: "cpolar-nanoflashing-technical-brief.pdf",
    title: "NanoFlashing Technical Brief",
    lines: [
      "How the permanent positive charge is bonded to the substrate.",
      "Coverage, durability, and substrate compatibility.",
      "Test conditions and independent lab methodology.",
      "",
      "Placeholder document for the C-POLAR portal demo.",
    ],
  },
  {
    file: "cpolar-hospital-pilot-summary.pdf",
    title: "Hospital Pilot Summary",
    lines: [
      "Ninety day pilot across two patient wings.",
      "Surface sampling cadence and control group setup.",
      "Facilities team observations and handover notes.",
      "",
      "Placeholder document for the C-POLAR portal demo.",
    ],
  },
  {
    file: "cpolar-independent-lab-results.pdf",
    title: "Independent Lab Results",
    lines: [
      "Third party testing against bacteria, viruses, and fungi.",
      "Contact time, reduction rates, and repeat testing at 12 months.",
      "",
      "Placeholder document for the C-POLAR portal demo.",
    ],
  },
  {
    file: "cpolar-facilities-spec-sheet.pdf",
    title: "Facilities Spec Sheet",
    lines: [
      "Application process, cure time, and cleaning guidance.",
      "What changes for janitorial staff, and what does not.",
      "",
      "Placeholder document for the C-POLAR portal demo.",
    ],
  },
  {
    file: "cpolar-investor-overview-q2.pdf",
    title: "Investor Overview, Q2",
    lines: [
      "Market, traction, and the case for built in protection.",
      "Pipeline by segment: healthcare, education, transit, hospitality.",
      "Validation to date and what comes next.",
      "",
      "Placeholder deck for the C-POLAR portal demo.",
    ],
  },
  {
    file: "cpolar-enterprise-buyer-deck.pdf",
    title: "Enterprise Buyer Deck",
    lines: [
      "The problem with protection that depends on behavior.",
      "Where C-POLAR fits in an existing facilities program.",
      "Cost per square foot and expected service life.",
      "",
      "Placeholder deck for the C-POLAR portal demo.",
    ],
  },
  {
    file: "cpolar-brand-guidelines.pdf",
    title: "C-POLAR Brand Guidelines",
    lines: [
      "Logo usage, clear space, and the lime accent rule.",
      "Photography direction: quiet, lived in, never clinical.",
      "Voice: state facts simply and let them stand.",
      "",
      "Placeholder document for the C-POLAR portal demo.",
    ],
  },
];

mkdirSync(OUT, { recursive: true });
for (const d of DOCS) {
  writeFileSync(join(OUT, d.file), buildPdf(d.title, d.lines));
  console.log("wrote", d.file);
}
console.log(`\n${DOCS.length} placeholder files in public/files/cpolar-demo/`);
