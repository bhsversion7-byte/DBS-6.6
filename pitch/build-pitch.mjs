import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const runtimeRoot =
  process.env.CODEX_RUNTIME_NODE_MODULES ||
  path.join(
    process.env.USERPROFILE || process.env.HOME || "",
    ".cache",
    "codex-runtimes",
    "codex-primary-runtime",
    "dependencies",
    "node",
    "node_modules",
  );

const artifactPath = path.join(
  runtimeRoot,
  "@oai",
  "artifact-tool",
  "dist",
  "artifact_tool.mjs",
);

const { Presentation, PresentationFile } = await import(pathToFileURL(artifactPath));

const SLIDE = { width: 1280, height: 720 };
const C = {
  bg: "#0B0F14",
  panel: "#111820",
  panel2: "#17212B",
  red: "#D32F2F",
  gold: "#D4AF37",
  gold2: "#F8E08E",
  white: "#FFFFFF",
  muted: "#9CA3AF",
  line: "#2B3644",
  green: "#34D399",
  teal: "#2DD4BF",
  blue: "#60A5FA",
};

const presentation = Presentation.create({ slideSize: SLIDE });
const outDir = path.resolve("pitch");
const previewDir = path.join(outDir, "preview");

function addShape(slide, { left, top, width, height, fill = C.panel, line = C.line, geometry = "rect" }) {
  return slide.shapes.add({
    geometry,
    position: { left, top, width, height },
    fill: fill === "none" ? { type: "none" } : { type: "solid", color: fill },
    line:
      line === "none"
        ? { fill: { type: "none" }, width: 0 }
        : { style: "solid", fill: line, width: 1 },
  });
}

function addText(
  slide,
  text,
  { left, top, width, height, size = 24, color = C.white, bold = false, align = "left", valign = "top" },
) {
  const shape = addShape(slide, { left, top, width, height, fill: "none", line: "none" });
  shape.text.style = {
    fontSize: size,
    color,
    bold,
    typeface: "Arial",
    alignment: align,
    verticalAlignment: valign,
    autoFit: "shrinkText",
    wrap: "square",
  };
  shape.text = text;
  return shape;
}

function title(slide, heading, kicker = "Bank-Grade FX Trading Platform MVP") {
  addText(slide, kicker, { left: 64, top: 36, width: 760, height: 28, size: 16, color: C.gold, bold: true });
  addText(slide, heading, { left: 64, top: 76, width: 920, height: 76, size: 40, bold: true });
  addShape(slide, { left: 64, top: 162, width: 150, height: 4, fill: C.red, line: "none" });
}

function newSlide() {
  const slide = presentation.slides.add();
  addShape(slide, { left: 0, top: 0, width: SLIDE.width, height: SLIDE.height, fill: C.bg, line: "none" });
  return slide;
}

function bulletList(slide, items, x, y, w, lineHeight = 46) {
  items.forEach((item, index) => {
    addShape(slide, { left: x, top: y + index * lineHeight + 10, width: 10, height: 10, fill: C.gold, line: "none", geometry: "ellipse" });
    addText(slide, item, { left: x + 24, top: y + index * lineHeight, width: w - 24, height: lineHeight, size: 21, color: C.white });
  });
}

function metric(slide, label, value, caption, x, y, w, color = C.gold) {
  addShape(slide, { left: x, top: y, width: w, height: 126, fill: C.panel, line: C.line });
  addText(slide, label, { left: x + 20, top: y + 18, width: w - 40, height: 26, size: 15, color: C.muted });
  addText(slide, value, { left: x + 20, top: y + 48, width: w - 40, height: 38, size: 31, color, bold: true });
  addText(slide, caption, { left: x + 20, top: y + 92, width: w - 40, height: 24, size: 13, color: C.muted });
}

function flowNode(slide, label, x, y, w = 156, color = C.panel2) {
  addShape(slide, { left: x, top: y, width: w, height: 72, fill: color, line: C.line });
  addText(slide, label, { left: x + 12, top: y + 18, width: w - 24, height: 36, size: 18, bold: true, align: "center", valign: "middle" });
}

function connector(slide, x1, y1, x2, y2, color = C.gold) {
  addShape(slide, { left: x1, top: y1, width: x2 - x1, height: 3, fill: color, line: "none" });
  addShape(slide, { left: x2 - 8, top: y2 - 6, width: 12, height: 12, fill: color, line: "none", geometry: "triangle" });
}

{
  const s = newSlide();
  addShape(s, { left: 0, top: 0, width: 1280, height: 108, fill: C.red, line: "none" });
  addText(s, "Bank-Grade Foreign Exchange Trading Platform", { left: 64, top: 42, width: 980, height: 56, size: 38, bold: true });
  addText(s, "Executable quote locking, trade lifecycle control, risk checks, auditability, and real-time notification demo", {
    left: 64,
    top: 168,
    width: 980,
    height: 70,
    size: 27,
    color: C.gold2,
    bold: true,
  });
  bulletList(
    s,
    [
      "Scenario: customer sells 10,000 USD and buys EUR",
      "Core workflow: rate lookup -> quote TTL -> idempotent trade -> risk -> settlement",
      "Architecture backbone: Next.js + FastAPI + PostgreSQL + Redis + WebSocket",
      "Pitch split: product, frontend, backend/data, DevOps/roadmap",
    ],
    84,
    290,
    760,
    52,
  );
  metric(s, "Demo target", "8 minutes", "4 presenters, one coherent story", 900, 290, 260, C.white);
  metric(s, "MVP scope", "Must-have+", "Bonus WebSocket and risk rules included", 900, 440, 260, C.gold);
}

{
  const s = newSlide();
  title(s, "Why this MVP matters");
  metric(s, "User need", "Lock an executable FX rate", "Avoid stale-market execution risk", 76, 210, 318, C.gold);
  metric(s, "Bank need", "Control every transition", "Risk, audit, and settlement traceability", 438, 210, 318, C.green);
  metric(s, "Platform need", "Scale to 100K users", "Stateless API plus cache and event pipeline", 800, 210, 318, C.blue);
  bulletList(
    s,
    [
      "The platform is not a simple currency converter; it is a controlled trade execution system.",
      "The MVP proves the hardest product moments: quote TTL, idempotency, state transition, and audit log.",
      "The demo UI is designed like an institutional treasury dashboard, not a consumer finance page.",
    ],
    112,
    430,
    1000,
    50,
  );
}

{
  const s = newSlide();
  title(s, "End-to-end demo journey");
  const nodes = ["Dashboard", "Search USD/EUR", "Get Quote", "30s TTL", "Submit Trade", "Risk Check", "Confirm", "Settle"];
  nodes.forEach((node, index) => {
    const x = 72 + (index % 4) * 292;
    const y = index < 4 ? 230 : 410;
    flowNode(s, node, x, y, 210, index === 2 || index === 5 ? C.red : C.panel2);
    if (index % 4 !== 3) connector(s, x + 210, y + 36, x + 282, y + 36);
  });
  addText(s, "Success signal: after the trade reaches SETTLED, the trade record, notification center, and audit log all show the same truth.", {
    left: 92,
    top: 590,
    width: 1090,
    height: 48,
    size: 23,
    color: C.gold2,
    bold: true,
    align: "center",
  });
}

{
  const s = newSlide();
  title(s, "Frontend: one workspace for the whole trade");
  [
    ["Market Overview", "Live bid/ask chart, pair table, spread and movement"],
    ["Quote Panel", "Currency selector, amount, executable rate, countdown"],
    ["Lifecycle Timeline", "CREATED -> CONFIRMED -> SETTLED with operator visibility"],
    ["Records + Audit", "Trade table, status logs, notification stream"],
  ].forEach(([h, b], index) => {
    const x = 86 + (index % 2) * 560;
    const y = index < 2 ? 210 : 410;
    addShape(s, { left: x, top: y, width: 480, height: 130, fill: C.panel, line: C.line });
    addText(s, h, { left: x + 24, top: y + 22, width: 430, height: 32, size: 24, color: C.gold, bold: true });
    addText(s, b, { left: x + 24, top: y + 66, width: 420, height: 42, size: 18, color: C.white });
  });
}

{
  const s = newSlide();
  title(s, "Core domain model and state machine");
  flowNode(s, "Quote ACTIVE", 88, 240, 180, C.red);
  connector(s, 268, 276, 348, 276);
  flowNode(s, "Quote USED", 348, 240, 180, C.panel2);
  flowNode(s, "Quote EXPIRED", 348, 360, 180, C.panel2);
  addText(s, "Quote cannot be traded after TTL reaches zero.", { left: 80, top: 478, width: 520, height: 36, size: 19, color: C.muted });
  const trade = ["CREATED", "QUOTE_LOCKED", "RISK_CHECK", "CONFIRMED", "SETTLEMENT", "SETTLED"];
  trade.forEach((node, index) => {
    const x = 650 + (index % 2) * 250;
    const y = 180 + Math.floor(index / 2) * 130;
    flowNode(s, node, x, y, 210, index === 2 ? C.red : C.panel2);
    if (index % 2 === 0) connector(s, x + 210, y + 36, x + 248, y + 36, C.green);
  });
}

{
  const s = newSlide();
  title(s, "Backend services and API contract");
  const layers = [
    ["API Gateway", "JWT, Pydantic validation, idempotency key, Swagger"],
    ["FX Service", "Supported currencies, rate provider abstraction, tiered polling"],
    ["Quote Service", "Executable rate, Decimal precision, Redis TTL"],
    ["Trade Service", "State machine, status log, settlement adapter"],
    ["Risk Service", "Expiry, duplicate, limit, AML, sanctions, velocity"],
    ["Notification Service", "Event bus fanout to WebSocket and notification table"],
  ];
  layers.forEach(([h, b], index) => {
    const x = 84 + (index % 3) * 374;
    const y = index < 3 ? 206 : 410;
    addShape(s, { left: x, top: y, width: 320, height: 126, fill: C.panel, line: C.line });
    addText(s, h, { left: x + 20, top: y + 18, width: 280, height: 30, size: 22, color: C.gold, bold: true });
    addText(s, b, { left: x + 20, top: y + 58, width: 280, height: 46, size: 16, color: C.white });
  });
}

{
  const s = newSlide();
  title(s, "Data design for auditability");
  const rows = [
    ["currencies", "Supported active currency universe"],
    ["fx_rates", "Provider rate snapshot with bid, ask, spread"],
    ["quotes", "Executable quote, amount, rate, target, TTL status"],
    ["trades", "Locked rate, status, risk score, settlement timestamps"],
    ["trade_status_logs", "Immutable old_status -> new_status transition record"],
    ["notifications", "Customer and operator event delivery record"],
  ];
  rows.forEach(([table, purpose], index) => {
    const y = 188 + index * 64;
    addShape(s, { left: 96, top: y, width: 260, height: 46, fill: index % 2 ? C.panel2 : C.panel, line: C.line });
    addText(s, table, { left: 116, top: y + 11, width: 220, height: 24, size: 18, color: C.gold, bold: true });
    addShape(s, { left: 356, top: y, width: 780, height: 46, fill: index % 2 ? C.panel2 : C.panel, line: C.line });
    addText(s, purpose, { left: 376, top: y + 11, width: 730, height: 24, size: 18, color: C.white });
  });
  addText(s, "Precision rule: never use float. Application uses Decimal; PostgreSQL stores NUMERIC(20,8).", {
    left: 112,
    top: 604,
    width: 980,
    height: 38,
    size: 22,
    color: C.gold2,
    bold: true,
  });
}

{
  const s = newSlide();
  title(s, "DevOps and deployment backbone");
  flowNode(s, "Next.js Web", 84, 240, 190, C.panel2);
  connector(s, 274, 276, 360, 276);
  flowNode(s, "FastAPI", 360, 240, 190, C.red);
  connector(s, 550, 276, 636, 276);
  flowNode(s, "PostgreSQL", 636, 240, 190, C.panel2);
  connector(s, 826, 276, 912, 276);
  flowNode(s, "Redis", 912, 240, 190, C.panel2);
  bulletList(
    s,
    [
      "Docker Compose demonstrates reproducible local infra: web, API, PostgreSQL, Redis.",
      "Production path: managed Postgres, managed Redis, containerized API, CDN-hosted frontend.",
      "Observability: request IDs, idempotency keys, trade_id correlation, state transition logs.",
      "Scalability path: Kafka, event sourcing, CQRS read models, multi-region active-active.",
    ],
    124,
    420,
    980,
    46,
  );
}

{
  const s = newSlide();
  title(s, "4-person pitch flow");
  [
    ["Speaker 1", "Product + problem", "Explain customer story and why quote locking is the MVP center."],
    ["Speaker 2", "Frontend demo", "Run USD -> EUR flow and show TTL, timeline, records, notifications."],
    ["Speaker 3", "Backend + data", "Walk through APIs, Decimal precision, state machine, audit tables."],
    ["Speaker 4", "DevOps + roadmap", "Cover Docker, Redis/Postgres, WebSocket, scale and production plan."],
  ].forEach(([speaker, topic, detail], index) => {
    const x = 94 + index * 286;
    addShape(s, { left: x, top: 224, width: 238, height: 260, fill: C.panel, line: index === 1 ? C.gold : C.line });
    addText(s, speaker, { left: x + 20, top: 250, width: 198, height: 34, size: 22, color: C.gold, bold: true, align: "center" });
    addText(s, topic, { left: x + 20, top: 310, width: 198, height: 38, size: 21, color: C.white, bold: true, align: "center" });
    addText(s, detail, { left: x + 22, top: 380, width: 194, height: 72, size: 16, color: C.muted, align: "center" });
  });
}

{
  const s = newSlide();
  title(s, "Close: MVP today, bank platform tomorrow");
  bulletList(
    s,
    [
      "Demo proves the quote-to-settlement path and makes system correctness visible.",
      "Backend contract already maps to production services and database boundaries.",
      "Risk, audit, idempotency, TTL, and notification design meet bank-grade foundations.",
      "Roadmap is incremental: provider integration, auth, persistent jobs, Kafka, CQRS, multi-region.",
    ],
    120,
    224,
    980,
    58,
  );
  addShape(s, { left: 160, top: 548, width: 960, height: 84, fill: C.red, line: "none" });
  addText(s, "Final demo line: this is not just a UI prototype; it is a production-shaped trading workflow.", {
    left: 190,
    top: 570,
    width: 900,
    height: 40,
    size: 25,
    bold: true,
    align: "center",
    valign: "middle",
  });
}

await fs.mkdir(previewDir, { recursive: true });
for (let i = 0; i < presentation.slides.count; i += 1) {
  const slide = presentation.slides.getItem(i);
  const png = await presentation.export({ slide, format: "png", scale: 0.5 });
  await fs.writeFile(path.join(previewDir, `slide-${String(i + 1).padStart(2, "0")}.png`), Buffer.from(await png.arrayBuffer()));
}

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(path.join(outDir, "fx-trading-platform-pitch.pptx"));
