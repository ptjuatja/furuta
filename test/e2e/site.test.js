/* E2E test for the Furuta Pendulum Lab site (runs against a local server). */
"use strict";
const puppeteer = require("puppeteer-core");

const URL = process.env.SITE_URL || "http://127.0.0.1:8123/";
const CHROME = process.env.CHROME || "/usr/bin/google-chrome";
const SHOTS = process.env.SHOTS || "shots";

let passed = 0, failed = 0;
function ok(cond, name, extra) {
  if (cond) { passed++; console.log("  \u2713 " + name); }
  else { failed++; console.log("  \u2717 " + name + (extra ? "  -> " + JSON.stringify(extra) : "")); }
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--window-size=1680,1100"],
    defaultViewport: { width: 1680, height: 1050 },
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  console.log("\n[1] Page load");
  await page.goto(URL, { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1500));
  const title = await page.title();
  ok(/Furuta/i.test(title), "title renders: " + title);

  console.log("\n[2] No fatal JS errors on load");
  const fatal = errors.filter((e) => !/three\.min\.js|OrbitControls/i.test(e));
  ok(fatal.length === 0, "console has no errors", fatal.slice(0, 5));

  console.log("\n[3] KaTeX rendered");
  const katexCount = await page.evaluate(() => document.querySelectorAll(".katex").length);
  ok(katexCount > 40, "many KaTeX elements rendered (" + katexCount + ")");
  const mathErrors = await page.evaluate(() => document.querySelectorAll(".math-error").length);
  ok(mathErrors === 0, "no KaTeX render errors (" + mathErrors + ")");

  console.log("\n[4] Figures & SVG present");
  const hasHeroCanvas = await page.evaluate(() => !!document.querySelector("#hero-3d canvas"));
  const hasFigCanvas = await page.evaluate(() => !!document.querySelector("#fig-system-3d canvas"));
  const hasBlueprint = await page.evaluate(() => !!document.querySelector("#fig-blueprint svg"));
  const hasBases = await page.evaluate(() => !!document.querySelector("#fig-bases svg"));
  const hasLqr = await page.evaluate(() => !!document.querySelector("#fig-lqr svg"));
  ok(hasHeroCanvas, "hero 3D canvas present");
  ok(hasFigCanvas, "derivation 3D canvas present");
  ok(hasBlueprint, "blueprint SVG present");
  ok(hasBases, "basis diagram SVG present");
  ok(hasLqr, "LQR block diagram SVG present");

  console.log("\n[5] Simulator booted");
  const simOk = await page.evaluate(() => {
    const s = window.__furutaSim;
    return { ok: !!s, tel: s ? s.telemetry : null, gains: s ? s.gains : null };
  });
  ok(simOk.ok, "window.__furutaSim available");
  ok(Array.isArray(simOk.gains) && simOk.gains.length === 4 && simOk.gains.every((v) => isFinite(v)),
    "LQR gains computed", simOk.gains);

  await page.screenshot({ path: SHOTS + "/01-home.png" });

  // scroll to simulator
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
  ok(/0\.00/.test(derived) && !/—/.test(derived), "derived J_theta/J_phi update", derived);

  console.log("\n[11] Dual-PID mode");
  await page.evaluate(() => {
    document.querySelector('[data-mode="pid"]').click();
    window.__furutaSim.setStartMode("upright");
    window.__furutaSim.reset();
    window.__furutaSim.start();
  });
  await new Promise((r) => setTimeout(r, 3000));
  const telP = await page.evaluate(() => window.__furutaSim.telemetry);
  ok(telP.mode === "balance" && Math.abs(telP.ph) < 0.3, "PID mode balances (phi=" + telP.ph.toFixed(3) + ", mode=" + telP.mode + ")");

  console.log("\n[12] View toggles don't break rendering");
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

  console.log("\n[13] Responsive mobile layout");
  await page.setViewport({ width: 420, height: 900 });
  await new Promise((r) => setTimeout(r, 600));
  const burgerVisible = await page.evaluate(() => {
    const b = document.getElementById("nav-burger");
    return getComputedStyle(b).display !== "none";
  });
  ok(burgerVisible, "burger menu visible on mobile");
  await page.screenshot({ path: SHOTS + "/04-mobile.png" });

  console.log("\n[14] Space bar toggles play/pause");
  await page.setViewport({ width: 1680, height: 1050 });
  await page.evaluate(() => { window.__furutaSim.setStartMode("upright"); window.__furutaSim.reset(); window.__furutaSim.start(); });
  await new Promise((r) => setTimeout(r, 1200));
  await page.keyboard.press("Space");               // pause
  await new Promise((r) => setTimeout(r, 400));
  const t1 = await page.evaluate(() => window.__furutaSim.telemetry.t);
  await new Promise((r) => setTimeout(r, 700));
  const t2 = await page.evaluate(() => window.__furutaSim.telemetry.t);
  ok(Math.abs(t2 - t1) < 0.02, "paused: time frozen (" + t1.toFixed(2) + " -> " + t2.toFixed(2) + ")");
  await page.keyboard.press("Space");               // resume
  await new Promise((r) => setTimeout(r, 500));
  const t3 = await page.evaluate(() => window.__furutaSim.telemetry.t);
  ok(t3 > t2 + 0.02, "resumed: time advances again (" + t2.toFixed(2) + " -> " + t3.toFixed(2) + ")");

  console.log("\n[15] Long-run stability: 30 s simulated at 4x");
  await page.evaluate(() => { window.__furutaSim.setSpeed(4); window.__furutaSim.setStartMode("hanging"); window.__furutaSim.reset(); window.__furutaSim.start(); });
  await new Promise((r) => setTimeout(r, 12000));
  const telLong = await page.evaluate(() => window.__furutaSim.telemetry);
  ok(telLong.t > 22 && telLong.mode === "balance" && Math.abs(telLong.ph) < 0.05,
    "still balancing at t=" + telLong.t.toFixed(1) + "s (phi=" + telLong.ph.toFixed(3) + ")");
  await page.screenshot({ path: SHOTS + "/05-longrun.png" });

  // final error sweep
  const finalErrors = errors.filter((e) => !/three\.min\.js|OrbitControls|WebGL/i.test(e));
  console.log("\n[16] Final error sweep");
  ok(finalErrors.length === 0, "no uncaught errors during entire session", finalErrors.slice(0, 6));

  await browser.close();
  console.log("\n======================================");
  console.log(`E2E PASS ${passed}  FAIL ${failed}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("E2E crashed:", e); process.exit(2); });
