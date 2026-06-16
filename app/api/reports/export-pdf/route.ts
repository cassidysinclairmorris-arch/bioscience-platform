import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { getDb } from "@/lib/db";
import type { Report } from "@/lib/db";
import path from "path";
import fs from "fs";

export const maxDuration = 60;

interface ExtractedData {
  impressions?: number | null;
  reach?: number | null;
  engagementRate?: number | null;
  totalEngagements?: number | null;
  reactions?: number | null;
  comments?: number | null;
  shares?: number | null;
  clicks?: number | null;
  followerCount?: number | null;
  followerGrowth?: number | null;
  followerGrowthPercent?: number | null;
  posts?: Array<{
    date?: string | null;
    content?: string | null;
    impressions?: number | null;
    engagementRate?: number | null;
    reactions?: number | null;
    comments?: number | null;
    shares?: number | null;
    clicks?: number | null;
    type?: string | null;
  }>;
  topPost?: { date?: string | null; content?: string | null; impressions?: number | null; engagementRate?: number | null } | null;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function pct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n.toFixed(1)}%`;
}

function buildHtml(report: Report, data: ExtractedData, clientName: string, audience: "agency" | "client", logoBase64?: string): string {
  const narrative = audience === "agency" ? (report.narrative_agency ?? "") : (report.narrative_client ?? "");
  const periodLabel = `${report.period_start} – ${report.period_end}`;
  const typeLabel = report.type === "weekly" ? "Weekly Snapshot" : "Monthly Report";
  const generatedDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const logoTag = logoBase64
    ? `<img src="data:image/png;base64,${logoBase64}" class="client-logo" alt="${clientName}" />`
    : `<span class="logo-text">${clientName}</span>`;

  const kpis = [
    { label: "Impressions",      value: fmt(data.impressions),           color: "#2255CC" },
    { label: "Reach",            value: fmt(data.reach),                 color: "#2BBFB0" },
    { label: "Engagement Rate",  value: pct(data.engagementRate),        color: "#C9A84C" },
    { label: "Total Engagements",value: fmt(data.totalEngagements),      color: "#6633CC" },
    { label: "Follower Count",   value: fmt(data.followerCount),         color: "#2255CC" },
    { label: "Follower Growth",  value: `${data.followerGrowth != null ? (data.followerGrowth > 0 ? "+" : "") + data.followerGrowth : "—"}`, color: "#2BBFB0" },
  ];

  const posts = (data.posts ?? []).slice(0, 10);
  const postRows = posts.map((p, i) => `
    <tr class="${i % 2 === 0 ? "even" : "odd"}${data.topPost?.content === p.content ? " top-post" : ""}">
      <td>${p.date ?? "—"}</td>
      <td class="content-cell">${(p.content ?? "—").slice(0, 120)}${(p.content?.length ?? 0) > 120 ? "…" : ""}</td>
      <td>${fmt(p.impressions)}</td>
      <td>${pct(p.engagementRate)}</td>
      <td>${fmt(p.reactions)}</td>
      <td>${fmt(p.comments)}</td>
      <td>${fmt(p.shares)}</td>
    </tr>`).join("");

  // Simple bar chart via inline styles
  const maxImpr = Math.max(...posts.map(p => p.impressions ?? 0), 1);
  const barChart = posts.length > 0 ? `
    <div class="bar-chart">
      ${posts.map(p => {
        const h = Math.max(4, Math.round(((p.impressions ?? 0) / maxImpr) * 100));
        return `<div class="bar-wrap">
          <div class="bar-val">${fmt(p.impressions)}</div>
          <div class="bar" style="height:${h}px"></div>
          <div class="bar-lbl">${p.date?.slice(5) ?? "—"}</div>
        </div>`;
      }).join("")}
    </div>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Inter:wght@400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; color: #1A1A1A; background: #fff; font-size: 11px; line-height: 1.5; }
  .page { padding: 40px 48px; max-width: 794px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 1px solid rgba(26,26,26,0.12); }
  .header-left h1 { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 300; font-style: italic; letter-spacing: -0.02em; margin-bottom: 4px; }
  .header-left .sub { font-size: 11px; color: rgba(26,26,26,0.50); margin-bottom: 3px; }
  .header-right { text-align: right; }
  .header-right .prepared { font-size: 9px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(26,26,26,0.40); margin-bottom: 6px; }
  .client-logo { height: 32px; object-fit: contain; }
  .logo-text { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 400; color: #1A1A1A; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 100px; font-size: 9px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; background: rgba(26,26,26,0.07); color: rgba(26,26,26,0.60); margin-bottom: 8px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
  .kpi-card { border: 1px solid rgba(26,26,26,0.10); border-radius: 8px; padding: 14px 16px; position: relative; overflow: hidden; }
  .kpi-bar { position: absolute; top: 0; left: 0; right: 0; height: 2px; }
  .kpi-label { font-size: 9px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(26,26,26,0.40); margin-bottom: 8px; }
  .kpi-value { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; letter-spacing: -0.02em; line-height: 1; }
  .section { margin-bottom: 28px; }
  .section-title { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 300; font-style: italic; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid rgba(26,26,26,0.08); }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { text-align: left; padding: 8px 10px; font-size: 8px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(26,26,26,0.40); border-bottom: 1px solid rgba(26,26,26,0.10); }
  td { padding: 8px 10px; border-bottom: 1px solid rgba(26,26,26,0.05); vertical-align: top; }
  tr.even { background: rgba(26,26,26,0.02); }
  tr.top-post { border-left: 2px solid #C9A84C; }
  .content-cell { max-width: 220px; color: rgba(26,26,26,0.70); }
  .narrative { font-size: 11px; line-height: 1.75; color: rgba(26,26,26,0.80); white-space: pre-wrap; }
  .bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 130px; margin-bottom: 4px; padding-top: 24px; }
  .bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .bar { width: 100%; background: #2255CC; opacity: 0.65; border-radius: 3px 3px 0 0; }
  .bar-val { font-size: 8px; color: rgba(26,26,26,0.50); }
  .bar-lbl { font-size: 8px; color: rgba(26,26,26,0.40); }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid rgba(26,26,26,0.08); display: flex; justify-content: space-between; font-size: 9px; color: rgba(26,26,26,0.35); }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      <div class="badge">${typeLabel}</div>
      <h1>${clientName}</h1>
      <div class="sub">${periodLabel}</div>
      <div class="sub">Generated ${generatedDate}</div>
    </div>
    <div class="header-right">
      <div class="prepared">Prepared by Linkwright</div>
      ${logoTag}
    </div>
  </div>

  <div class="kpi-grid">
    ${kpis.map(k => `
      <div class="kpi-card">
        <div class="kpi-bar" style="background:${k.color};opacity:0.65"></div>
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value">${k.value}</div>
      </div>`).join("")}
  </div>

  ${posts.length > 0 ? `
  <div class="section">
    <div class="section-title">Impressions by Post</div>
    ${barChart}
  </div>

  <div class="section">
    <div class="section-title">Post Performance</div>
    <table>
      <thead>
        <tr>
          <th>Date</th><th>Content</th><th>Impressions</th><th>Eng. Rate</th><th>Reactions</th><th>Comments</th><th>Shares</th>
        </tr>
      </thead>
      <tbody>${postRows}</tbody>
    </table>
    ${data.topPost ? `<p style="font-size:9px;color:rgba(26,26,26,0.45);margin-top:6px;">★ Gold border = top performing post</p>` : ""}
  </div>` : ""}

  ${narrative ? `
  <div class="section">
    <div class="section-title">${audience === "agency" ? "Agency Analysis" : "Performance Summary"}</div>
    <div class="narrative">${narrative.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
  </div>` : ""}

  <div class="footer">
    <span>Linkwright — LinkedIn Content Agency</span>
    <span>${periodLabel}</span>
  </div>
</div>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const audience = (searchParams.get("audience") ?? "client") as "agency" | "client";

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const report = db.prepare("SELECT * FROM reports WHERE id = ?").get(id) as Report | null;
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const clientRow = db.prepare("SELECT name, logo_file FROM clients WHERE id = ?").get(report.client_id) as { name: string; logo_file: string | null } | null;
  const clientName = clientRow?.name ?? "Client";

  let logoBase64: string | undefined;
  if (clientRow?.logo_file) {
    try {
      const logoPath = path.join(process.cwd(), "public", clientRow.logo_file.replace(/^\//, ""));
      if (fs.existsSync(logoPath)) logoBase64 = fs.readFileSync(logoPath).toString("base64");
    } catch { /* skip */ }
  }

  const data: ExtractedData = report.extracted_data ? JSON.parse(report.extracted_data) : {};
  const html = buildHtml(report, data, clientName, audience, logoBase64);

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdfUint8 = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `<div style="font-size:9px;color:rgba(26,26,26,0.35);width:100%;text-align:center;padding-bottom:8px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
    });
    const pdfBuffer = Buffer.from(pdfUint8);

    const safeClientName = clientName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
    const filename = `${safeClientName}-${report.type}-${report.period_start.slice(0, 7)}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } finally {
    await browser?.close();
  }
}
