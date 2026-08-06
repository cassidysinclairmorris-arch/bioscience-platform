// Demo data for the C-POLAR client portal.
//
// Six months of operation on the Growth tier (8 posts per month): posts through
// to published with per-post analytics, monthly published reports with entered
// metrics, an asset library uploaded by the client's own team, a team roster,
// message threads, and invoices.
//
// Only touches rows belonging to client_id 'cpolar'. Re-running wipes and
// rebuilds that client's data, so it is safe to run repeatedly.
//
//   npx tsx scripts/seed-cpolar-demo.ts

import { getDb, hashPassword } from "../lib/db";

const CLIENT_ID = "cpolar";
const CLIENT_NAME = "C-POLAR Technologies";
const DEMO_PASSWORD = "Cpolar2026!";
// Six months ending in the current month. "Today" for the demo is late July 2026.
const MONTHS = ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"];

// Deterministic jitter so re-running produces identical numbers.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rand = rng(20260730);
const jitter = (base: number, pct: number) => Math.round(base * (1 + (rand() * 2 - 1) * pct));

// ── Posting schedule ──────────────────────────────────────────────────────────
// Tue/Wed/Thu/Fri map to the four content pillars. Eight posts a month, spread
// across the month, two per pillar.
const PILLAR_BY_DOW: Record<number, string> = {
  2: "Science insight",
  3: "Human story",
  4: "Industry POV",
  5: "Proof & traction",
};
const TIME_BY_DOW: Record<number, string> = { 2: "09:00", 3: "10:00", 4: "09:00", 5: "15:00" };

function datesFor(ym: string): { date: string; dow: number }[] {
  const [y, m] = ym.split("-").map(Number);
  const byDow: Record<number, number[]> = { 2: [], 3: [], 4: [], 5: [] };
  const last = new Date(y, m, 0).getDate();
  for (let d = 1; d <= last; d++) {
    const dow = new Date(y, m - 1, d).getDay();
    if (byDow[dow]) byDow[dow].push(d);
  }
  const pick = (dow: number, i: number) => byDow[dow][Math.min(i, byDow[dow].length - 1)];
  const chosen = [
    { dow: 2, day: pick(2, 0) }, { dow: 3, day: pick(3, 0) },
    { dow: 4, day: pick(4, 1) }, { dow: 5, day: pick(5, 1) },
    { dow: 2, day: pick(2, 2) }, { dow: 3, day: pick(3, 2) },
    { dow: 4, day: pick(4, 3) }, { dow: 5, day: pick(5, 3) },
  ];
  return chosen
    .sort((a, b) => a.day - b.day)
    .map(c => ({ date: `${ym}-${String(c.day).padStart(2, "0")}`, dow: c.dow }));
}

// ── Post content ──────────────────────────────────────────────────────────────
// Eight per month, written in the C-POLAR voice: quiet, specific, no hype.
// Order within a month follows the calendar, so pillars land on their own days.
const CONTENT: Record<string, string[]> = {
  "2026-02": [
    `Most surface protection works for about twenty minutes.

You wipe a door handle. It is clean. Then someone touches it.

NanoFlashing bonds a permanent positive charge to the surface itself. The charge does not wear off between cleanings, because it is not a cleaning. It is part of the material now.

No chemicals. No electricity. No schedule to keep.`,

    `A facilities director at a 400 bed hospital told us he stopped counting how many times a day his team disinfects a handrail.

The number was not the problem. The gaps between were.

Three months after treating two patient wings, his surface sampling looked different in a way that did not depend on anyone remembering anything.

That is the part he keeps repeating to other directors: it does not depend on anyone remembering anything.`,

    `We spend about 90% of our lives indoors.

Almost every protection strategy we have built for those spaces asks a person to do something. Wash. Wipe. Remember. Comply.

Protection that depends on behavior will fail at exactly the moment it matters, because that is when people are busiest.

The alternative is to build it into the room and stop asking.`,

    `Dr. Michael Mansour at Harvard called C-POLAR an essential interrupter of infectious spread.

That sentence took years of independent testing to earn, and we did not write it.

Independent validation is slow and it is expensive. It is also the only thing that lets a hospital procurement team say yes without hedging.`,

    `A question we get from every engineer: why does the charge not wash off?

Because it is not a coating sitting on top of the surface. NanoFlashing bonds at the molecular level to the substrate.

Cleaning removes what is on the surface. It does not remove the surface.

Twelve months of scheduled janitorial cleaning, retested, same charge.`,

    `The night shift is where infection control actually happens.

We spent a week with a cleaning crew at a long term care facility. Two people, ninety rooms, six hours.

They are not cutting corners. The math simply does not allow for perfection, and no product should pretend otherwise.

What we can do is make the hours between their rounds count for something.`,

    `Compliance rates are the quiet admission at the center of infection control.

Hand hygiene compliance in most hospitals sits between 40% and 60%. Everyone knows this. Everyone has a plan to improve it.

We have been trying to improve it for forty years.

At some point the honest response is to stop building systems that require the number to be 100%.`,

    `First pilot, two wings, ninety days.

Surface sampling on high touch points, same cleaning protocol as before, same staff, same schedule. The only change was the surface.

We are not publishing the reduction figures until the second site finishes, because one site is an anecdote.

The second site started in January.`,
  ],

  "2026-03": [
    `What a positive charge does to a bacterial cell:

Bacteria, viruses, and fungi carry a negative charge on their outer membrane. A strong positive charge pulls that membrane toward the surface and ruptures it.

There is no chemical reaction and nothing for an organism to adapt to. It is physics, and physics does not develop resistance.

That last part matters more than anything else we could tell you.`,

    `A school district facilities manager described his February to us in one line: two weeks of normal, then everyone is out.

He has 31 buildings and a budget that assumed 2019 attendance.

We are working with him on four of them. Not because four is the right number, but because it is the number he can defend to a board this year.`,

    `There is a lot of cleaning theater in commercial buildings right now.

Fogging machines in empty lobbies. Signs about enhanced protocols. A staff member wiping a surface someone will touch four seconds later.

It looks like protection. It reassures people, which has some value.

It is not the same as changing what happens on the surface for the next twelve months.`,

    `We retested the original treated panels at twelve months.

Same charge. Same efficacy against the same organisms. After a year of standard commercial cleaning.

Durability is the whole argument. A treatment that fades in ninety days is a subscription, not a solution.`,

    `No chemicals. No electricity. No maintenance.

Those three constraints shaped every decision in the technology, and each one came from a facilities team telling us why the last product failed.

Chemicals need storage, training, and disposal. Electricity needs a circuit and a failure mode. Maintenance needs a person who is already fully booked.

Remove all three and adoption stops being a project.`,

    `A nurse manager walked us through her week.

She is responsible for patient outcomes, staff schedules, supply shortages, and family communication. Somewhere in that list is environmental hygiene.

She does not need another responsibility. She needs one fewer.

That is the only product brief we work from.`,

    `Procurement usually asks what does it cost per square foot.

The more useful question is what does it cost per year of protection, including the labor to maintain it.

One number makes a treated surface look expensive. The other makes it look like the cheapest line in the facilities budget.

We are happy to be judged on the second one.`,

    `Update from the BGIS pilot.

Twelve weeks in across a mixed use commercial property. High touch surfaces treated, cleaning protocol unchanged, sampling handled by a third party rather than by us.

Their senior director is presenting the internal results next month. When it is public, we will share it here in full, including anything that did not go our way.`,
  ],

  "2026-04": [
    `Fungi are the part of the conversation nobody wants.

Mold remediation in a commercial building runs into six figures and shuts down floors. It also comes back, because the conditions that caused it are still there.

The same positive charge that ruptures a bacterial membrane works on fungal spores. Same mechanism, no chemicals, on surfaces where moisture is a permanent fact.`,

    `A hotel general manager told us his guests never mention cleanliness when it is good.

They mention it once, loudly, in a review, when it is not.

He runs 240 rooms on thin margins and a housekeeping team that turns over twice a year. Consistency across that many hands is the actual product he is selling.`,

    `Indoor air and indoor surfaces are infrastructure.

We treat them like housekeeping. We fund them like housekeeping. Then we are surprised when a building makes people sick and the response has to be emergency spending.

Buildings have a plumbing standard and an electrical standard. The biological standard is a mop and good intentions.`,

    `Third party lab results, published in full.

We send samples to labs that have no relationship with us and no reason to be generous. Contact time, organism panel, and reduction rates are all in the report.

If you want the raw methodology rather than the summary, ask and we will send it. The interesting part is always the methodology.`,

    `Surfaces or air: the wrong question.

A pathogen does not respect the category. It moves from a hand to a handle to a filter and back.

Treating one and ignoring the other leaves a route open. We build for both because the organism does not care how we organize our product lines.`,

    `A parent asked us the only question that matters to her.

Her daughter is four and in daycare five days a week. She wanted to know whether the treatment leaves anything behind that a child could touch, breathe, or put in her mouth.

The answer is no, and the testing that supports that answer is the longest section of our technical file.

Any answer shorter than the testing behind it is a sales pitch.`,

    `Facilities budgets run on a twelve month cycle. Health outcomes do not.

A treatment that pays for itself over three years is a hard sell in a one year budget, even when everyone in the room agrees with the math.

We have started structuring pilots around the budget cycle rather than pretending it does not exist. Adoption is a finance problem as much as a science one.`,

    `New distribution partner covering the Northeast commercial market.

They came to us after running their own comparison against two competing treatments, on their own sites, without telling us.

That is the kind of partner worth having. They already know what the product does when nobody is watching.`,
  ],

  "2026-05": [
    `Water systems are the overlooked surface.

Cooling towers, tanks, and pipework hold biofilm that survives most chemical treatment and rebuilds within weeks.

A permanently charged surface changes the substrate biofilm has to attach to. Early data from two industrial sites is encouraging enough that we have expanded the test.`,

    `A senior living director described her hardest month.

An outbreak means visitation stops. For a resident with dementia, three weeks without a familiar face is not a precaution, it is a loss that does not come back.

She does not talk about infection rates. She talks about visits.

We have started using her language.`,

    `Standards lag behind evidence by about a decade.

That gap is not corruption or incompetence. It is committees, review cycles, and the reasonable caution of people who get blamed when a standard is wrong.

It does mean a building operator can be fully compliant and still be a decade behind what the evidence supports.

Compliance is a floor.`,

    `Every pilot site from last year renewed.

We would rather report that than a growth number, because renewal is the only metric that cannot be bought with a discount.

One site expanded to a second campus before the first contract ended.`,

    `Durability testing is the least interesting work we do and the most important.

Abrasion cycles. Cleaning chemical exposure. UV. Temperature swings. Then retest the charge and start again.

Most of it is a machine rubbing a panel for weeks while somebody logs numbers. It is also the entire difference between a product and a demonstration.`,

    `A maintenance lead asked the sharpest question we have had all year.

What happens when my team does something wrong?

Not what happens when it works. What happens at the failure point, with the wrong chemical, on the wrong day, by someone on their second shift.

We tested for it because he asked. The answer is in the spec sheet now.`,

    `What does clean actually mean in a commercial building?

Usually it means it looks clean and it smells like it was cleaned recently.

Neither of those is a measurement. Both of them are what the contract is written against.

Until clean is defined as a number someone samples for, buildings will keep buying the appearance of it.`,

    `Second campus went live this month.

Same client, different site, larger footprint, and this time their own facilities team handled application with our training rather than our crew.

That was the real test. The technology has to work when we are not in the building.`,
  ],

  "2026-06": [
    `Medical devices and PPE are where contact time gets short.

A gown, a mask, a device housing touched forty times an hour. There is no cleaning cycle that fits between those touches.

Built in protection is the only kind that operates at the speed of actual use.`,

    `A surgeon told us he assumes every surface in his hospital is contaminated.

Not as a complaint. As a working model that keeps his patients safe.

He was clear that he does not want a product that makes anyone relax. He wants one that quietly narrows the gap while everyone keeps behaving exactly as carefully as they do now.

That is the right way to think about it.`,

    `The economics of infection control are backwards.

Prevention comes out of the facilities budget. Infection comes out of the clinical budget, the insurance line, and the reputation of the institution.

Two different cost centers, two different approval chains, one problem. The building manager cannot access the savings his spending creates.

Most of what looks like reluctance to invest is really an accounting boundary.`,

    `Our first peer reviewed paper is out.

Independent authors, independent data, and a review process that took eleven months and made the paper better.

We will post the link and the plain language summary this week. Read the limitations section. It is the most honest part of any paper, including ours.`,

    `Filtration is where the charge does something different.

On a filter medium, a permanent positive charge captures and inactivates rather than just trapping. A loaded filter stops being a reservoir.

This is the work behind Inhalo, and it is the piece we are least willing to rush.`,

    `A transit operations manager runs 1,100 vehicles.

Every one of them is a shared indoor space with a new set of occupants every few minutes and a cleaning window measured in seconds.

He does not have a hygiene problem he can solve with labor. Nobody at that scale does.`,

    `Buildings are becoming health systems whether we plan for it or not.

Ventilation, filtration, water, surfaces, occupancy. Every one of those is a health decision made by someone whose title has nothing to do with health.

The next decade of building standards is going to be written in medical language. Operators who start now will not have to retrofit their way into it.`,

    `Airport pilot results are in.

Six months, high traffic terminal surfaces, sampling by the airport authority's own contractor rather than ours.

They have approved expansion to two more terminals. The full summary is in the report your team received this week.`,
  ],

  "2026-07": [
    `ReinFire started as a question from a client we could not answer.

He wanted to know why fire retardant treatment and antimicrobial treatment were two separate applications, two vendors, and two line items on his budget.

There was no good technical reason. There was only how the industries had grown up.`,

    `Our manufacturing partner has been making coatings for thirty years.

When we brought them the process, their first response was that the cure window was too tight for production volume.

They were right. We spent four months fixing it before we sold anything at scale.

Manufacturing partners who tell you no early are worth more than the ones who say yes.`,

    `There is a policy window opening on indoor environmental quality.

Several states are drafting standards for schools and public buildings. Most of the drafts focus on air and stop there.

Surfaces will be added later, after the first standard is already written and harder to change. Now is when operators should be in the room.`,

    `Q2 in numbers.

Four new enterprise pilots, two campus expansions, one peer reviewed publication, and a distribution agreement covering the Northeast.

One pilot did not convert. The site decided the timing was wrong for their budget cycle, and they were right to wait.`,

    `How long does the protection last?

Our tested answer is twelve months confirmed, with ongoing testing past that point on panels installed at the start.

We will tell you eighteen months when we have eighteen months of data. Not before.`,

    `An investor asked what keeps us up at night.

Not competition. The slow pace at which a building operator can move even when they are fully convinced.

Budget cycles, procurement rules, board approvals, and one facilities director carrying it all on top of an existing job.

The technology was the easy part.`,

    `Pilots are not a sales tactic for us, they are how we find out what is wrong.

Every site so far has surfaced something the lab did not: a cleaning chemical we had not tested, a substrate that behaved differently, a workflow nobody described to us accurately.

If a vendor tells you their pilot phase is a formality, they are describing a demo.`,

    `Six months of independent sampling across four client sites.

Different building types, different contractors, different cleaning regimes, none of the sampling done by us.

We will publish the combined dataset once the fourth site completes in September, including the site where results were weakest.`,
  ],
};

// Upcoming work: two approved and waiting to publish, three sitting with the
// client for approval. This is what the portal's approval queue is showing.
const UPCOMING: { date: string; dow: number; status: "scheduled" | "pending_approval"; content: string }[] = [
  {
    date: "2026-07-31", dow: 5, status: "scheduled",
    content: `Every treated site from our first year renewed this quarter.

Renewal is the only number in this business that cannot be discounted into existence. A client either wanted it again or they did not.

Six for six.`,
  },
  {
    date: "2026-08-04", dow: 2, status: "scheduled",
    content: `Contact time is the number nobody asks about.

Most disinfectants list a kill rate. Fewer list how many minutes the surface has to stay wet to reach it, and almost nobody in a real building has those minutes.

A permanently charged surface has no contact time to manage. It is either bonded or it is not.`,
  },
  {
    date: "2026-08-05", dow: 3, status: "pending_approval",
    content: `A hospital environmental services director has been doing this for 22 years.

She has watched four different technologies arrive as the answer. Each one added a step to her team's day and quietly disappeared within three years.

Her question for us was not about efficacy. It was whether her team would have to do anything differently.

The answer is no, and that is why she said yes.`,
  },
  {
    date: "2026-08-06", dow: 4, status: "pending_approval",
    content: `Antimicrobial resistance is a chemistry problem.

Organisms adapt to chemical agents because chemistry gives them something to adapt to. Forty years of that has produced the resistance crisis we are now managing.

A physical mechanism does not offer the same opening. A ruptured membrane is not a challenge an organism learns from.

This is the argument we expect to be having for the next decade.`,
  },
  {
    date: "2026-08-07", dow: 5, status: "pending_approval",
    content: `Independent validation, in one place.

Harvard. Two accredited third party labs. One peer reviewed publication. Six client sites sampling on their own contracts, with their own contractors.

None of them work for us. That is the entire point of the list.`,
  },
];

// Marketing photography stands in for the branded visuals on some posts.
const POST_IMAGES = ["/images/4.png", "/images/6.png", "/images/11.png", "/images/13.png", "/images/14.png", "/images/16.png", "/images/17.png", "/images/19.png", "/images/20.png", "/images/8.png"];

// ── Reports ───────────────────────────────────────────────────────────────────
const NARRATIVES: Record<string, { client: string; agency: string }> = {
  "2026-02": {
    client: `February was your first full month of consistent posting, and the baseline it sets is a useful one. Eight posts went live across all four pillars. Impressions landed at just under 19,000 with an engagement rate of 3.2%, which is normal for a first month where the audience is still forming.

The clearest signal is which pillar performed. Proof and traction posts, particularly the Harvard validation post, carried roughly twice the engagement of the average post. Your audience is responding to third party credibility rather than product explanation.

Follower Quality Index opened at 41. That means 41% of new engagement came from the roles you are trying to reach: facility managers, public health officials, and enterprise buyers. Everything from here is measured against that number.`,
    agency: `Baseline month. Cadence established at 8 per month, all four pillars in rotation. Proof pillar outperforming by roughly 2x, so weight it more heavily in March. FQI 41 is a reasonable start for a cold audience. Watch whether science insight posts pick up once the account has more history.`,
  },
  "2026-03": {
    client: `March grew on every measure that matters. Impressions rose 34% to just over 25,000 and the engagement rate climbed to 3.8%. More usefully, the growth came from a wider set of people rather than more activity from the same ones.

The twelve month retest post was the strongest of the month. Durability is clearly the objection your audience is carrying, and answering it directly with data outperformed everything else. We are building more content around that objection.

Follower Quality Index moved from 41 to 46. Facility managers are now the largest single group in your engaged audience.`,
    agency: `Durability is the buying objection. The twelve month retest post confirmed it. Shift the science pillar toward objection handling rather than mechanism explanation. FQI up 5 points, driven by facilities job titles. Comment volume still low relative to reactions, so test more direct questions in April.`,
  },
  "2026-04": {
    client: `April was the month comments came alive. Reactions grew steadily, but comment volume more than doubled, and the conversations were with the right people. Several came from operations leaders at organizations that match your target profile.

The daycare post reached a different audience than the rest of your content and pulled the highest engagement rate of any post so far at 7.1%. Safety questions asked plainly, and answered plainly, travel further than technical explanation.

Impressions reached 31,400. Follower Quality Index rose to 51, crossing the point where the majority of your engagement comes from your target roles rather than general interest.`,
    agency: `Comments doubled. Plain language safety content is the unlock. FQI crossed 50, which is the threshold worth calling out to the client. Distribution partner announcement performed below average, so keep partner news brief and infrequent.`,
  },
  "2026-05": {
    client: `May held the gains and deepened them. Impressions were 36,900 with engagement at 5.2%, and profile views grew 41%, which is usually the sign that people are moving from reading a post to investigating the company.

The renewal post was the highest performing content of the month. A short factual statement about every pilot site renewing did more than any longer argument about efficacy.

Follower Quality Index reached 55. The composition shifted again, with more enterprise buyers and a noticeable increase in public health roles.`,
    agency: `Profile views up 41%, the leading indicator for inbound. Short factual proof posts outperform long form argument consistently now. Three months of that pattern. Recommend cutting average post length in June and measuring.`,
  },
  "2026-06": {
    client: `June was your strongest month. The peer reviewed publication announcement was the single best performing post since you started, at 12,400 impressions and an 8.9% engagement rate, and it brought in an audience that had not engaged with you before.

Impressions closed at 43,200 with engagement at 5.9%. Follower growth of 164 was more than double February.

Follower Quality Index reached 59. The publication post is the clearest evidence yet that independent validation moves your specific audience more than anything you say about yourselves.`,
    agency: `Publication post is the ceiling case: 8.9% engagement, 12.4k impressions. Independent validation outperforms everything. Recommend planning content around the next two validation milestones rather than filling with product education. FQI 59.`,
  },
  "2026-07": {
    client: `July continued the pattern, with impressions at 47,800 and engagement holding at 6.1% across eight posts. Holding an engagement rate while volume grows is harder than raising it, and that is what happened this month.

Shorter posts continued to outperform. The Q2 numbers post, which was six lines including one pilot that did not convert, drew more comments than any longer post in the month. Naming the loss is doing real work for your credibility.

Follower Quality Index reached 63, up 22 points across six months. Just under two thirds of your engagement now comes from facility managers, enterprise buyers, public health officials, and investors.`,
    agency: `Six month arc complete: FQI 41 to 63, impressions 18.9k to 47.8k, engagement 3.2% to 6.1%. Transparency about the lost pilot outperformed. Recommend the client keep that habit. Next quarter: build around validation milestones, keep posts under 120 words.`,
  },
};

// Monthly headline figures. Hand set so the six month arc reads cleanly.
const MONTHLY: Record<string, { impressions: number; engagement: number; followerGrowth: number; followerCount: number; fqi: number; profileViews: number }> = {
  "2026-02": { impressions: 18900, engagement: 3.2, followerGrowth: 71,  followerCount: 1420, fqi: 41, profileViews: 310 },
  "2026-03": { impressions: 25300, engagement: 3.8, followerGrowth: 94,  followerCount: 1514, fqi: 46, profileViews: 402 },
  "2026-04": { impressions: 31400, engagement: 4.6, followerGrowth: 118, followerCount: 1632, fqi: 51, profileViews: 528 },
  "2026-05": { impressions: 36900, engagement: 5.2, followerGrowth: 133, followerCount: 1765, fqi: 55, profileViews: 745 },
  "2026-06": { impressions: 43200, engagement: 5.9, followerGrowth: 164, followerCount: 1929, fqi: 59, profileViews: 891 },
  "2026-07": { impressions: 47800, engagement: 6.1, followerGrowth: 178, followerCount: 2107, fqi: 63, profileViews: 1024 },
};

// ── Seed ──────────────────────────────────────────────────────────────────────
async function main() {
  const db = getDb();

  console.log(`Seeding demo data for ${CLIENT_NAME} (${CLIENT_ID})\n`);

  // Wipe this client's data only.
  await db.prepare("DELETE FROM post_analytics WHERE client_id = ?").run(CLIENT_ID);
  await db.prepare("DELETE FROM post_assets WHERE post_id IN (SELECT id FROM posts WHERE company_id = ?)").run(CLIENT_ID);
  await db.prepare("DELETE FROM posts WHERE company_id = ?").run(CLIENT_ID);
  await db.prepare("DELETE FROM assets WHERE client_id = ?").run(CLIENT_ID);
  await db.prepare("DELETE FROM messages WHERE company_id = ?").run(CLIENT_ID);
  await db.prepare("DELETE FROM client_users WHERE company_id = ?").run(CLIENT_ID);
  await db.prepare("DELETE FROM report_uploads WHERE client_id = ?").run(CLIENT_ID);
  await db.prepare("DELETE FROM reports WHERE client_id = ?").run(CLIENT_ID);
  await db.prepare("DELETE FROM invoices WHERE client_id = ?").run(CLIENT_ID);
  console.log("Cleared existing C-POLAR data");

  // Growth tier: 8 posts a month, Follower Quality Index unlocked.
  await db.prepare("UPDATE clients SET tier = 'growth' WHERE id = ?").run(CLIENT_ID);
  console.log("Tier set to Growth");

  // ── Team ────────────────────────────────────────────────────────────────────
  const TEAM = [
    { first: "Dana",   last: "Whitfield", email: "dana.whitfield@c-polar.com",  role: "owner",         title: "VP Marketing",            pw: true,  created: "2026-01-28", login: "2026-07-29 08:12:00" },
    { first: "Marcus", last: "Lee",       email: "marcus.lee@c-polar.com",      role: "administrator", title: "Communications Manager",  pw: true,  created: "2026-02-03", login: "2026-07-28 14:40:00" },
    { first: "Priya",  last: "Raman",     email: "priya.raman@c-polar.com",     role: "user",          title: "Product Marketing Lead",  pw: true,  created: "2026-03-11", login: "2026-07-24 11:05:00" },
    { first: "Tom",    last: "Alvarez",   email: "tom.alvarez@c-polar.com",     role: "user",          title: "Regional Sales Director", pw: false, created: "2026-07-21", login: null },
  ];
  const userIds: Record<string, number> = {};
  for (const t of TEAM) {
    await db.prepare(
      `INSERT INTO client_users (first_name, last_name, email, password_hash, password_reset_token, role, company_id, job_title, must_reset_password, active, created_at, last_login)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    ).run(
      t.first, t.last, t.email,
      t.pw ? hashPassword(DEMO_PASSWORD) : null,
      t.pw ? null : "demo-invite-token-tom",
      t.role, CLIENT_ID, t.title,
      t.pw ? 0 : 1,
      `${t.created} 09:00:00`, t.login
    );
    const row = await db.prepare("SELECT id FROM client_users WHERE email = ?").get(t.email) as { id: number };
    userIds[t.first] = row.id;
  }
  console.log(`Team: ${TEAM.length} members (3 active, 1 invite pending)`);

  // ── Posts + analytics ───────────────────────────────────────────────────────
  let postCount = 0, imgIdx = 0;
  const monthPostIds: Record<string, number[]> = {};

  for (let mi = 0; mi < MONTHS.length; mi++) {
    const ym = MONTHS[mi];
    const dates = datesFor(ym);
    const bank = CONTENT[ym];
    monthPostIds[ym] = [];

    for (let i = 0; i < dates.length && i < bank.length; i++) {
      const { date, dow } = dates[i];
      const at = `${date} ${TIME_BY_DOW[dow]}:00`;
      const pillar = PILLAR_BY_DOW[dow];
      const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dow];
      // Roughly every other post carries a visual.
      const image = i % 2 === 0 ? POST_IMAGES[imgIdx++ % POST_IMAGES.length] : null;

      await db.prepare(
        `INSERT INTO posts (company_id, company_name, post_type, scheduled_day, content, status, week_number, image_url, created_at, updated_at, approved_at, scheduled_at, posted_at)
         VALUES (?, ?, ?, ?, ?, 'posted', ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        CLIENT_ID, CLIENT_NAME, pillar, dayName, bank[i], Math.floor(i / 2) + 1, image,
        `${date} 07:30:00`, at, `${date} 08:15:00`, at, at
      );
      const row = await db.prepare("SELECT last_insert_rowid() AS id").get() as { id: number };
      monthPostIds[ym].push(row.id);
      postCount++;

      // Per-post analytics, scaled so each month's posts sum near the monthly total.
      const m = MONTHLY[ym];
      const base = m.impressions / 8;
      const impressions = jitter(base, 0.35);
      const er = Number((m.engagement * (0.8 + rand() * 0.5)).toFixed(1));
      const engagements = Math.round(impressions * (er / 100));
      const likes = Math.round(engagements * 0.68);
      const comments = Math.round(engagements * 0.14);
      const reposts = Math.round(engagements * 0.09);
      const clicks = Math.round(engagements * 0.09);

      await db.prepare(
        `INSERT INTO post_analytics (post_id, client_id, impressions, engagement_rate, clicks, likes, comments, reposts, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(row.id, CLIENT_ID, impressions, er, clicks, likes, comments, reposts, `${date} 23:00:00`);
    }
  }

  // Upcoming: approved and awaiting approval.
  for (const u of UPCOMING) {
    const at = `${u.date} ${TIME_BY_DOW[u.dow]}:00`;
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][u.dow];
    await db.prepare(
      `INSERT INTO posts (company_id, company_name, post_type, scheduled_day, content, status, week_number, image_url, created_at, updated_at, approved_at, scheduled_at, posted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`
    ).run(
      CLIENT_ID, CLIENT_NAME, PILLAR_BY_DOW[u.dow], dayName, u.content, u.status, 1,
      u.status === "scheduled" ? POST_IMAGES[imgIdx++ % POST_IMAGES.length] : null,
      "2026-07-27 09:00:00", "2026-07-27 09:00:00",
      u.status === "scheduled" ? "2026-07-27 16:20:00" : null,
      at
    );
    postCount++;
  }
  const published = postCount - UPCOMING.length;
  const sched = UPCOMING.filter(u => u.status === "scheduled").length;
  console.log(`Posts: ${postCount} (${published} published, ${sched} scheduled, ${UPCOMING.length - sched} awaiting approval)`);

  // ── Reports + entered metrics ───────────────────────────────────────────────
  for (const ym of MONTHS) {
    const m = MONTHLY[ym];
    const [y, mo] = ym.split("-").map(Number);
    const lastDay = new Date(y, mo, 0).getDate();
    const engagements = Math.round(m.impressions * (m.engagement / 100));

    // Top posts of the month, pulled from the analytics just written.
    const top = await db.prepare(
      `SELECT p.content, p.post_type, p.posted_at, a.impressions, a.engagement_rate, a.likes, a.comments, a.reposts, a.clicks
         FROM posts p JOIN post_analytics a ON a.post_id = p.id
        WHERE p.company_id = ? AND p.posted_at LIKE ?
        ORDER BY a.impressions DESC LIMIT 5`
    ).all(CLIENT_ID, `${ym}%`) as Record<string, unknown>[];

    const extracted = {
      impressions: m.impressions,
      reach: Math.round(m.impressions * 0.72),
      engagementRate: m.engagement,
      totalEngagements: engagements,
      reactions: Math.round(engagements * 0.68),
      comments: Math.round(engagements * 0.14),
      shares: Math.round(engagements * 0.09),
      clicks: Math.round(engagements * 0.09),
      followerCount: m.followerCount,
      followerGrowth: m.followerGrowth,
      followerGrowthPercent: Number(((m.followerGrowth / (m.followerCount - m.followerGrowth)) * 100).toFixed(1)),
      posts: top.map(t => ({
        date: String(t.posted_at).slice(0, 10),
        content: String(t.content).split("\n")[0],
        impressions: t.impressions,
        engagementRate: t.engagement_rate,
        reactions: t.likes,
        comments: t.comments,
        shares: t.reposts,
        clicks: t.clicks,
        type: t.post_type,
      })),
    };

    await db.prepare(
      `INSERT INTO reports (client_id, type, period_start, period_end, status, extracted_data, narrative_agency, narrative_client, created_at, updated_at, published_at)
       VALUES (?, 'monthly', ?, ?, 'published', ?, ?, ?, ?, ?, ?)`
    ).run(
      CLIENT_ID, `${ym}-01`, `${ym}-${lastDay}`,
      JSON.stringify(extracted),
      NARRATIVES[ym].agency, NARRATIVES[ym].client,
      `${ym}-${lastDay} 10:00:00`, `${ym}-${lastDay} 10:00:00`, `${ym}-${lastDay} 16:00:00`
    );

    // Entered metric values. Growth tier unlocks Follower Quality Index; the
    // two higher Signals stay empty because the tier does not include them.
    const metrics: Record<string, number> = {
      impressions: m.impressions,
      engagement_rate: m.engagement,
      follower_growth: m.followerGrowth,
      reach: Math.round(m.impressions * 0.72),
      reactions: Math.round(engagements * 0.68),
      comments: Math.round(engagements * 0.14),
      reposts: Math.round(engagements * 0.09),
      profile_views: m.profileViews,
      follower_quality_index: m.fqi,
    };
    for (const [key, value] of Object.entries(metrics)) {
      await db.prepare(
        `INSERT INTO report_uploads (client_id, period, metric_key, value, image_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?)`
      ).run(CLIENT_ID, ym, key, value, `${ym}-${lastDay} 09:00:00`, `${ym}-${lastDay} 09:00:00`);
    }
  }
  console.log(`Reports: ${MONTHS.length} published, ${MONTHS.length * 9} metric values entered`);

  // ── Asset library ───────────────────────────────────────────────────────────
  const PILLARS = await db.prepare("SELECT id, type FROM pillars WHERE client_id = ? ORDER BY sort_order").all(CLIENT_ID) as { id: number; type: string }[];
  const pillarId = (type: string) => PILLARS.find(p => p.type === type)?.id ?? null;

  const ASSETS: { url: string; name: string; type: string; size: number; pillar: string | null; by: string; notes: string; at: string }[] = [
    { url: "/images/13.png", name: "hospital-wing-install-01.jpg", type: "image", size: 2411000, pillar: "Proof & traction", by: "Marcus", notes: "Install photos from the Cleveland hospital wing. Cleared by their comms team for external use.", at: "2026-02-11 14:22:00" },
    { url: "/images/4.png",  name: "lab-testing-panels.jpg",       type: "image", size: 1885000, pillar: "Science insight", by: "Priya",  notes: "Test panels at the independent lab. Good for anything about durability testing.", at: "2026-03-04 10:15:00" },
    { url: "/images/6.png",  name: "facilities-team-portrait.jpg", type: "image", size: 3102000, pillar: "Human story",     by: "Dana",   notes: "Facilities crew at the Northeast site. Signed releases on file for all four people.", at: "2026-03-19 16:48:00" },
    { url: "/images/14.png", name: "product-detail-macro.jpg",     type: "image", size: 1640000, pillar: "Science insight", by: "Priya",  notes: "Macro shot of a treated surface. Use for the NanoFlashing explainer posts.", at: "2026-04-08 09:33:00" },
    { url: "/images/19.png", name: "school-district-corridor.jpg", type: "image", size: 2740000, pillar: null,              by: "Marcus", notes: "Corridor shot from the school district pilot. No students in frame, safe to publish.", at: "2026-05-06 11:20:00" },
    { url: "/images/17.png", name: "conference-booth-2026.jpg",    type: "image", size: 2213000, pillar: null,              by: "Dana",   notes: "Booth photos from the facilities management expo in May.", at: "2026-05-22 15:05:00" },
    { url: "/images/20.png", name: "airport-terminal-pilot.jpg",   type: "image", size: 2955000, pillar: "Proof & traction", by: "Marcus", notes: "Terminal surfaces from the airport pilot. Airport authority approved these five frames only.", at: "2026-06-17 13:41:00" },
    { url: "/images/11.png", name: "founder-headshot-2026.jpg",    type: "image", size: 1420000, pillar: "Human story",     by: "Dana",   notes: "Updated headshot. Replaces the 2024 version everywhere.", at: "2026-07-09 08:55:00" },

    { url: "/files/cpolar-demo/cpolar-nanoflashing-technical-brief.pdf", name: "NanoFlashing Technical Brief.pdf", type: "document", size: 1840000, pillar: "Science insight",  by: "Priya",  notes: "Current version. Anything technical should be checked against this first.", at: "2026-02-05 09:10:00" },
    { url: "/files/cpolar-demo/cpolar-hospital-pilot-summary.pdf",       name: "Hospital Pilot Summary.pdf",       type: "document", size: 960000,  pillar: "Proof & traction", by: "Marcus", notes: "Ninety day results. Numbers are approved for external use, site name is not.", at: "2026-03-27 14:02:00" },
    { url: "/files/cpolar-demo/cpolar-independent-lab-results.pdf",      name: "Independent Lab Results.pdf",      type: "document", size: 1230000, pillar: "Proof & traction", by: "Priya",  notes: "Third party lab report. Full methodology is in the appendix.", at: "2026-04-14 10:44:00" },
    { url: "/files/cpolar-demo/cpolar-facilities-spec-sheet.pdf",        name: "Facilities Spec Sheet.pdf",        type: "document", size: 720000,  pillar: null,               by: "Marcus", notes: "What changes for a janitorial team and what does not. Sales sends this constantly.", at: "2026-06-02 16:30:00" },
    { url: "/files/cpolar-demo/cpolar-brand-guidelines.pdf",             name: "C-POLAR Brand Guidelines.pdf",     type: "document", size: 4100000, pillar: null,               by: "Dana",   notes: "Logo, colour, and voice. The lime accent rule matters, please read that page.", at: "2026-02-02 08:40:00" },

    { url: "/files/cpolar-demo/cpolar-investor-overview-q2.pdf",  name: "Investor Overview Q2.pdf",  type: "slideshow", size: 6300000, pillar: null,               by: "Dana",   notes: "Q2 investor deck. Do not post publicly, reference only for tone and figures.", at: "2026-05-29 17:12:00" },
    { url: "/files/cpolar-demo/cpolar-enterprise-buyer-deck.pdf", name: "Enterprise Buyer Deck.pdf", type: "slideshow", size: 5100000, pillar: "Industry POV",     by: "Marcus", notes: "What sales walks buyers through. Useful source material for carousel posts.", at: "2026-06-24 11:58:00" },

    { url: "/files/cpolar-demo/cpolar-facility-walkthrough.mp4",      name: "Facility Walkthrough.mp4",      type: "video", size: 48200000, pillar: "Human story",      by: "Marcus", notes: "Raw walkthrough with the facilities director. Two usable quotes around the 40 second mark.", at: "2026-04-30 15:26:00" },
    { url: "/files/cpolar-demo/cpolar-application-process-clip.mp4",  name: "Application Process Clip.mp4",  type: "video", size: 31500000, pillar: "Science insight",  by: "Priya",  notes: "Application process, shot at the manufacturing partner. No audio, add captions.", at: "2026-07-15 12:09:00" },
  ];

  for (const a of ASSETS) {
    await db.prepare(
      `INSERT INTO assets (client_id, pillar_id, uploaded_by, file_url, file_name, file_type, file_size, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(CLIENT_ID, a.pillar ? pillarId(a.pillar) : null, userIds[a.by], a.url, a.name, a.type, a.size, a.notes, a.at, a.at);
  }
  console.log(`Assets: ${ASSETS.length} uploaded by the client team`);

  // ── Messages ────────────────────────────────────────────────────────────────
  const THREADS: { user: string; msgs: { sender: "client" | "admin"; body: string; at: string; read: boolean }[] }[] = [
    {
      user: "Dana",
      msgs: [
        { sender: "admin",  body: "February is live and the first eight posts are scheduled. You will see them in the approval queue every Thursday for the following week.", at: "2026-02-02 09:14:00", read: true },
        { sender: "client", body: "Got it. One thing: can we avoid naming the hospital in anything public? Their comms team is strict about it.", at: "2026-02-02 11:02:00", read: true },
        { sender: "admin",  body: "Noted and added to your brand rules. Sites stay anonymous unless you tell us otherwise in writing.", at: "2026-02-02 11:40:00", read: true },
        { sender: "client", body: "The Harvard post did really well. Sales sent it to three prospects already.", at: "2026-02-27 16:31:00", read: true },
        { sender: "admin",  body: "That matches what we are seeing. Third party validation is your strongest pillar by a wide margin, so we are weighting it heavier in March.", at: "2026-02-27 17:05:00", read: true },
        { sender: "client", body: "The peer reviewed paper clears embargo on the 15th. Can we build the month around it?", at: "2026-06-03 08:22:00", read: true },
        { sender: "admin",  body: "Yes. We will hold the announcement for the 18th, then follow with a plain language summary and a limitations post. Three posts, one milestone.", at: "2026-06-03 09:47:00", read: true },
        { sender: "client", body: "The Q2 post naming the pilot we lost was the right call. Two prospects mentioned it on calls this week.", at: "2026-07-24 14:18:00", read: true },
        { sender: "admin",  body: "Good to hear. Your June report is published in the portal, and next week's five posts are in your queue for approval.", at: "2026-07-27 09:30:00", read: false },
      ],
    },
    {
      user: "Marcus",
      msgs: [
        { sender: "client", body: "Uploaded the airport terminal photos to the library. Only the five frames their authority approved, please do not pull from anywhere else.", at: "2026-06-17 13:52:00", read: true },
        { sender: "admin",  body: "Received, thank you. Tagged them to Proof and traction and flagged the restriction on the asset so nobody on our side goes looking for more.", at: "2026-06-17 15:10:00", read: true },
        { sender: "client", body: "Can we get a carousel out of the enterprise buyer deck? Slides 4 through 9 are the useful part.", at: "2026-07-22 10:05:00", read: false },
      ],
    },
  ];

  let msgCount = 0;
  for (const t of THREADS) {
    for (const m of t.msgs) {
      await db.prepare(
        `INSERT INTO messages (client_user_id, company_id, sender, body, created_at, read_at) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(userIds[t.user], CLIENT_ID, m.sender, m.body, m.at, m.read ? m.at : null);
      msgCount++;
    }
  }
  console.log(`Messages: ${msgCount} across 2 threads`);

  // ── Invoices (agency side) ──────────────────────────────────────────────────
  let inv = 0;
  for (const ym of MONTHS) {
    const [y, mo] = ym.split("-").map(Number);
    const lastDay = new Date(y, mo, 0).getDate();
    const due = new Date(y, mo, 15);
    const paid = ym !== "2026-07";
    await db.prepare(
      `INSERT INTO invoices (id, number, client_id, client_name, date, due_date, items, status, tax_rate, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
    ).run(
      `inv-cpolar-${ym}`, `CP-${ym.replace("-", "")}`, CLIENT_ID, CLIENT_NAME,
      `${ym}-${lastDay}`, `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-15`,
      JSON.stringify([{ description: `LinkedIn management, Growth tier, ${ym}`, quantity: 1, rate: 1200 }]),
      paid ? "paid" : "pending",
      "Growth tier: 8 posts, Audience Traction reporting, content pillar development.",
      `${ym}-${lastDay} 09:00:00`
    );
    inv++;
  }
  console.log(`Invoices: ${inv} monthly at $1,200`);

  console.log(`\nDone.\n\nPortal login at /client/login`);
  console.log(`  Owner          dana.whitfield@c-polar.com   ${DEMO_PASSWORD}`);
  console.log(`  Administrator  marcus.lee@c-polar.com       ${DEMO_PASSWORD}`);
  console.log(`  User           priya.raman@c-polar.com      ${DEMO_PASSWORD}`);
  console.log(`  Tom Alvarez has a pending invite and cannot log in, by design.`);
}

main().catch(e => { console.error(e); process.exit(1); });
