/* E2E test for the Furuta Pendulum Lab site (runs against a local server).
 *
 * The site is multi-page: index (hero) + one page per section. Tests that need
 * DOM from a particular section navigate to that section's page first.
 */
"use strict";
const puppeteer = require("puppeteer-core");

const SITE = process.env.SITE_URL || "http://127.0.0.1:8123/";
/* strip any filename so SITE_URL may point at either a directory or index.html */
const BASE = SITE.replace(/[^/]*$/, "");
const url = (p) => BASE + p;
const CHROME = process.env.CHROME || "/usr/bin/google-chrome";
const SHOTS = process.env.SHOTS || "shots";

let passed = 0, failed = 0;
function ok(cond, name, extra) {
  if (cond) { passed++; console.log("  \u2713 " + name); }
  else { failed++; console.log("  \u2717 " + name + (extra ? "  -> " + JSON.stringify(extra) : "")); }
}

/* the five pages, with the section DOM each one is expected to own */
const PAGES = [
  { file: "index.html", title: /Furuta/i, page: "home", shot: "01-home.png" },
  { file: "system.html", title: /\u00a71|System/i, page: "system", shot: "07-system.png" },
  { file: "derivation.html", title: /\u00a72|Derivation/i, page: "derivation", shot: "08-derivation.png" },
  { file: "build.html", title: /\u00a73|Build/i, page: "build", shot: "09-build.png" },
  { file: "simulator.html", title: /\u00a74|Simulator/i, page: "simulator", shot: null },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--window-size=1680,1100"],
    defaultViewport: { width: 1680, height: 1050 },
  });
  const page = await browser.newPage();
  let errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  /* ------------------------------------------------------------------ */
  console.log("\n[1] Every page loads with its own title and no JS errors");
  for (const spec of PAGES) {
    errors = [];
    const resp = await page.goto(url(spec.file), { waitUntil: "networkidle0", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1200));
    ok(resp && resp.status() === 200, spec.file + ": HTTP 200", resp && resp.status());
    const title = await page.title();
    ok(spec.title.test(title), spec.file + ": title matches (" + title + ")");
    const fatal = errors.filter((e) => !/three\.min\.js|OrbitControls/i.test(e));
    ok(fatal.length === 0, spec.file + ": no console errors", fatal.slice(0, 4));
    if (spec.shot) await page.screenshot({ path: SHOTS + "/" + spec.shot });
  }

  /* ------------------------------------------------------------------ */
  console.log("\n[2] Each section's figures live on its own page");
  const figures = [
    { file: "index.html", sel: "#hero-3d canvas", name: "hero 3D canvas" },
    { file: "system.html", sel: "#fig-system-3d canvas", name: "system 3D canvas" },
    { file: "derivation.html", sel: "#fig-bases svg", name: "basis diagram SVG" },
    { file: "derivation.html", sel: "#fig-lqr svg", name: "LQR block diagram SVG" },
    { file: "build.html", sel: "#fig-blueprint svg", name: "blueprint SVG" },
    { file: "simulator.html", sel: "#sim-viewport", name: "simulator viewport" },
  ];
  for (const f of figures) {
    if (!page.url().endsWith(f.file)) await page.goto(url(f.file), { waitUntil: "networkidle0" });
    const present = await page.evaluate((s) => !!document.querySelector(s), f.sel);
    ok(present, f.name + " present on " + f.file);
  }
  /* each page carries exactly its own section and no other */
  for (const spec of PAGES) {
    await page.goto(url(spec.file), { waitUntil: "domcontentloaded" });
    const ids = await page.evaluate(() =>
      Array.from(document.querySelectorAll("main section")).map((s) => s.id));
    if (spec.page === "home") ok(ids.length === 0, "home has no section blocks", ids);
    else ok(ids.length === 1 && ids[0] === spec.page, spec.file + " carries only #" + spec.page, ids);
  }

  /* ------------------------------------------------------------------ */
  console.log("\n[3] KaTeX rendered, no render errors anywhere");
  for (const spec of PAGES) {
    await page.goto(url(spec.file), { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 600));
    const m = await page.evaluate(() => ({
      katex: document.querySelectorAll(".katex").length,
      bad: document.querySelectorAll(".math-error").length,
    }));
    ok(m.bad === 0, spec.file + ": no KaTeX render errors (" + m.bad + ")");
    if (spec.page === "derivation") ok(m.katex > 40, "derivation renders lots of math (" + m.katex + ")");
    if (spec.page === "system") ok(m.katex > 5, "system renders its math (" + m.katex + ")");
  }

  /* ------------------------------------------------------------------ */
  console.log("\n[4] Navbar links point at pages and mark the current one");
  for (const spec of PAGES) {
    await page.goto(url(spec.file), { waitUntil: "domcontentloaded" });
    const nav = await page.evaluate(() => ({
      links: Array.from(document.querySelectorAll(".nav-links a")).map((a) => a.getAttribute("href")),
      active: Array.from(document.querySelectorAll(".nav-links a.active")).map((a) => a.getAttribute("href")),
      drawer: Array.from(document.querySelectorAll(".nav-drawer a")).map((a) => a.getAttribute("href")),
      cta: (document.querySelector(".nav-cta") || {}).getAttribute
        ? document.querySelector(".nav-cta").getAttribute("href") : null,
      brand: document.querySelector(".nav-brand").getAttribute("href"),
    }));
    ok(JSON.stringify(nav.links) === JSON.stringify(["system.html", "derivation.html", "build.html"]),
      spec.file + ": nav links are the three section pages", nav.links);
    ok(nav.cta === "simulator.html", spec.file + ": CTA opens the simulator", nav.cta);
    ok(nav.drawer.indexOf("simulator.html") >= 0 && nav.drawer.length === 4,
      spec.file + ": drawer links all four sections", nav.drawer);
    const expectActive = ["system", "derivation", "build"].indexOf(spec.page) >= 0
      ? [spec.page + ".html"] : [];
    ok(JSON.stringify(nav.active) === JSON.stringify(expectActive),
      spec.file + ": current page marked in nav", nav.active);
    ok(spec.page === "home" ? nav.brand === "#top" : nav.brand === "index.html",
      spec.file + ": brand link goes home", nav.brand);
  }

  /* a real click-through, not just attribute inspection.
   * click() and waitForNavigation() must be armed together, or the navigation
   * can finish before we start waiting for it. */
  const navTo = async (selector) => {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }),
      page.click(selector),
    ]);
    return page.url();
  };
  await page.goto(url("index.html"), { waitUntil: "domcontentloaded" });
  ok(/system\.html$/.test(await navTo('.nav-links a[href="system.html"]')),
    "clicking 'System' navigates to system.html");
  ok(/build\.html$/.test(await navTo('.nav-links a[href="build.html"]')),
    "clicking 'Build Guide' navigates to build.html");
  ok(/simulator\.html$/.test(await navTo(".nav-cta")),
    "clicking the CTA navigates to simulator.html");

  /* no stale same-page anchors left over from the one-page layout */
  const stale = [];
  for (const spec of PAGES) {
    await page.goto(url(spec.file), { waitUntil: "domcontentloaded" });
    const bad = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a[href]"))
        .map((a) => a.getAttribute("href"))
        .filter((h) => ["#system", "#derivation", "#build", "#simulator"].indexOf(h) >= 0));
    if (bad.length) stale.push(spec.file + ": " + bad.join(","));
  }
  ok(stale.length === 0, "no section anchors left pointing within a page", stale);

  /* ------------------------------------------------------------------ */
  console.log("\n[5] Simulator booted");
  errors = [];
  await page.goto(url("simulator.html"), { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1500));
  const simOk = await page.evaluate(() => {
    const s = window.__furutaSim;
    return { ok: !!s, gains: s ? s.gains : null };
  });
  ok(simOk.ok, "window.__furutaSim available");
  ok(Array.isArray(simOk.gains) && simOk.gains.length === 4 && simOk.gains.every((v) => isFinite(v)),
    "LQR gains computed", simOk.gains);

  console.log("\n[6] Simulator: swing-up from hanging");
  await page.evaluate(() => { window.__furutaSim.setStartMode("hanging"); window.__furutaSim.reset(); window.__furutaSim.start(); });
  // wait for capture (up to 12 s real time; sim runs at 1x)
  let captureTime = null;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const tel = await page.evaluate(() => window.__furutaSim.telemetry);
    if (tel.mode === "balance" && Math.abs(tel.ph) < 0.15) { captureTime = tel.t; break; }
  }
  ok(captureTime != null, "swing-up captured and balancing (t=" + (captureTime != null ? captureTime.toFixed(2) : "never") + "s)");
  await new Promise((r) => setTimeout(r, 1200)); // let the controller settle after capture
  const tel1 = await page.evaluate(() => window.__furutaSim.telemetry);
  ok(Math.abs(tel1.ph) < 0.12, "balancing near upright (phi=" + tel1.ph.toFixed(3) + ")");

  console.log("\n[7] Disturbance rejection (kick while balancing)");
  await page.evaluate(() => { window.__furutaSim.setKick(1.6); window.__furutaSim.kick(); });
  let recovered = false, fell = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const tel = await page.evaluate(() => window.__furutaSim.telemetry);
    if (Math.abs(tel.ph) > 1.0 && tel.mode === "swing") fell = true;
    if (tel.t > 5 && Math.abs(tel.ph) < 0.05 && tel.mode === "balance") { recovered = true; break; }
  }
  ok(recovered && !fell, "recovers from a hard kick (fell=" + fell + ")");

  await page.screenshot({ path: SHOTS + "/02-simulator-balanced.png" });

  console.log("\n[8] Charts & telemetry updating");
  const chartCtx = await page.evaluate(() => {
    const cv = document.getElementById("chart-angles");
    return { w: cv.width, h: cv.height };
  });
  ok(chartCtx.w > 0 && chartCtx.h > 0, "charts have non-zero size");
  const tele = await page.evaluate(() => ({
    th: document.getElementById("tel-th").textContent,
    ph: document.getElementById("tel-ph").textContent,
    mode: document.getElementById("tel-mode").textContent,
  }));
  ok(tele.mode === "BALANCE", "telemetry badge shows BALANCE", tele);

  console.log("\n[9] LQR gain recompute on weight change");
  const g1 = await page.evaluate(() => window.__furutaSim.gains[0]);
  await page.evaluate(() => {
    const s = document.getElementById("q-phi");
    s.value = "800";
    s.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 300));
  const g2 = await page.evaluate(() => window.__furutaSim.gains[0]);
  ok(g2 !== g1 && isFinite(g2), "gain updated after q_phi change (" + g1.toFixed(2) + " -> " + g2.toFixed(2) + ")");

  console.log("\n[10] Param change rescales scene");
  await page.evaluate(() => {
    const s = document.getElementById("p-lA");
    s.value = "0.35";
    s.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 300));
  const derived = await page.evaluate(() => document.getElementById("derived-readout").textContent);
  ok(/0\.00/.test(derived) && !/\u2014/.test(derived), "derived J_theta/J_phi update", derived);

  console.log("\n[11] View toggles don't break rendering");
  for (const id of ["v-bases", "v-arcs", "v-gravity", "v-velocity", "v-torque", "v-trail", "v-grid"]) {
    await page.evaluate((i) => {
      const el = document.getElementById(i);
      el.checked = false;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, id);
  }
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: SHOTS + "/03-simulator-minimal.png" });
  const errsAfter = errors.filter((e) => !/three\.min\.js/i.test(e));
  ok(errsAfter.length === 0, "no errors after overlay toggles", errsAfter.slice(0, 3));

  console.log("\n[12] Responsive mobile layout");
  await page.setViewport({ width: 420, height: 900 });
  await new Promise((r) => setTimeout(r, 600));
  const burgerVisible = await page.evaluate(() => {
    const b = document.getElementById("nav-burger");
    return getComputedStyle(b).display !== "none";
  });
  ok(burgerVisible, "burger menu visible on mobile");

  /* the drawer is the only way to reach the sections on a phone — it must work */
  const drawerNav = await page.evaluate((file) => {
    document.getElementById("nav-burger").click();
    const drawer = document.getElementById("nav-drawer");
    const open = drawer.classList.contains("open");
    const link = drawer.querySelector('a[href="' + file + '"]');
    return { open: open, hasLink: !!link };
  }, "simulator.html");
  ok(drawerNav.open && drawerNav.hasLink, "burger opens the drawer with page links", drawerNav);
  await page.screenshot({ path: SHOTS + "/04-mobile.png" });
  await page.evaluate(() => {
    document.getElementById("nav-burger").click();
  });

  console.log("\n[13] Space bar toggles play/pause");
  await page.setViewport({ width: 1680, height: 1050 });
  await page.evaluate(() => { window.__furutaSim.setStartMode("upright"); window.__furutaSim.reset(); window.__furutaSim.start(); });
  await new Promise((r) => setTimeout(r, 1200));
  await page.keyboard.press("Space");               // pause
  await new Promise((r) => setTimeout(r, 600));     // let any in-flight physics backlog drain
  const t1 = await page.evaluate(() => window.__furutaSim.telemetry.t);
  await new Promise((r) => setTimeout(r, 900));
  const t2 = await page.evaluate(() => window.__furutaSim.telemetry.t);
  // while running, 900 ms of wall clock advances ~0.4 s of sim on this renderer
  ok(Math.abs(t2 - t1) < 0.15, "paused: time frozen (" + t1.toFixed(2) + " -> " + t2.toFixed(2) + ")");
  await page.keyboard.press("Space");               // resume
  // poll rather than assume a fixed wall-clock budget (software WebGL is slow)
  let t3 = t2;
  for (let i = 0; i < 20 && !(t3 > t2 + 0.02); i++) {
    await new Promise((r) => setTimeout(r, 300));
    t3 = await page.evaluate(() => window.__furutaSim.telemetry.t);
  }
  ok(t3 > t2 + 0.02, "resumed: time advances again (" + t2.toFixed(2) + " -> " + t3.toFixed(2) + ")");

  console.log("\n[14] Long-run stability: 30 s simulated at 4x");
  await page.evaluate(() => { window.__furutaSim.setSpeed(4); window.__furutaSim.setStartMode("hanging"); window.__furutaSim.reset(); window.__furutaSim.start(); });
  // poll to the simulated-time target instead of assuming a wall-clock budget
  let telLong = await page.evaluate(() => window.__furutaSim.telemetry);
  for (let i = 0; i < 90 && telLong.t <= 22; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    telLong = await page.evaluate(() => window.__furutaSim.telemetry);
  }
  ok(telLong.t > 22 && telLong.mode === "balance" && Math.abs(telLong.ph) < 0.05,
    "still balancing at t=" + telLong.t.toFixed(1) + "s (phi=" + telLong.ph.toFixed(3) + ")");
  await page.screenshot({ path: SHOTS + "/05-longrun.png" });

  // final error sweep
  const finalErrors = errors.filter((e) => !/three\.min\.js|OrbitControls|WebGL/i.test(e));
  console.log("\n[15] Final error sweep");
  ok(finalErrors.length === 0, "no uncaught errors during entire session", finalErrors.slice(0, 6));

  await browser.close();
  console.log("\n======================================");
  console.log(`E2E PASS ${passed}  FAIL ${failed}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("E2E crashed:", e); process.exit(2); });
