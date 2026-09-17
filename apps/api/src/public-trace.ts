export function escapeHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function publicOrigin() {
  const url = new URL(
    process.env.PUBLIC_ORIGIN ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL
        : undefined) ||
      process.env.WEB_ORIGIN ||
      "http://localhost:8080",
  );
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Invalid PUBLIC_ORIGIN");
  return url.origin;
}
export function tracePage(r: Record<string, any>) {
  const esc = escapeHtml;
  const date = (v: any) =>
    v
      ? new Date(v).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        })
      : "Not configured";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(r.product)} · Batch traceability</title><style>body{margin:0;background:#f3f7f1;color:#213e2b;font:16px/1.7 system-ui,sans-serif}main{max-width:620px;margin:6vh auto;padding:32px;background:white;border:1px solid #dfe8db;border-radius:18px}header{color:#738769;font-size:13px;letter-spacing:2px}h1{font-size:32px;line-height:1.2}h2{font-size:18px}dl{display:grid;grid-template-columns:1fr 1.4fr;gap:12px;border-top:1px solid #e5eae2;padding-top:22px}dt{color:#6c7a66}dd{margin:0;overflow-wrap:anywhere}footer{margin-top:28px;font-size:13px;color:#71816b}@media(max-width:650px){main{margin:16px;padding:24px}dl{grid-template-columns:1fr}dd{margin-top:-10px}}</style></head><body><main><header>FROM SEED TO YOUR TABLE</header><h1>${esc(r.product)}</h1><h2>${esc(r.farm)}</h2><p>${esc(r.address)}</p><dl><dt>Growing batch</dt><dd>${esc(r.batch)}</dd><dt>Harvested on</dt><dd>${esc(date(r.harvestedAt))}</dd><dt>Packed on</dt><dd>${esc(date(r.packedAt))}</dd><dt>Best before</dt><dd>${esc(date(r.bestBefore))}</dd><dt>Storage instructions</dt><dd>${esc(r.storageInstructions || "Contact the farm for storage guidance.")}</dd></dl><footer>Dates and storage information are supplied by the farm. Customer and school information is not published.</footer></main></body></html>`;
}
