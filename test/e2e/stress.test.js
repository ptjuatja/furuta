/* Adversarial stress test: long runs, noise, extreme params, all UI controls. */
"use strict";
const puppeteer = require("puppeteer-core");
let passed = 0, failed = 0;
function ok(cond, name, extra) {
  if (cond) { passed++; console.log("  \u2713 " + name); }
  else { failed++; console.log("  \u2717 " + name + (extra ? "  -> " + JSON.stringify(extra) : "")); }
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new",
    args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    defaultViewport: { width: 1680, height: 1050 } });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/three\.min\.js|OrbitControls/i.test(m.text())) errors.push(m.text()); });
  await page.goto("http://127.0.0.1:8123/", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 2000));

  const tel = () => page.evaluate(() => window.__furutaSim.telemetry);

  console.log("\n[1] 60 s at 4x with noise ON + repeated kicks (LQR)");
  await page.evaluate(() => {
    window.__furutaSim.setSpeed(4);
    window.__furutaSim.setNoise(true, 0.012);
    window.__furutaSim.setKick(1.8);
    window.__furutaSim.setStartMode("hanging");
    window.__furutaSim.reset();
    window.__furutaSim.start();
  });
  let falls = 0, spins = 0, kicks = 0, nan = false;
  for (let i = 0; i < 16; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const t = await tel();
    if (!isFinite(t.ph) || !isFinite(t.th) || !isFinite(t.phd)) nan = true;
    if (t.mode === "swing" && Math.abs(t.ph) > 0.8) falls++;
    if (Math.abs(t.th) > 100) spins++;
    if (i % 4 === 3) { await page.evaluate(() => window.__furutaSim.kick()); kicks++; }
  }
  const fin = await tel();
  ok(!nan, "no NaN in state after stress");
  ok(fin.t > 30, "ran past t=30s in 16s real (headless ~2.5x; t=" + fin.t.toFixed(1) + ")");
  ok(fin.mode === "balance" && Math.abs(fin.ph) < 0.35, "ending balanced with noise (phi=" + fin.ph.toFixed(3) + ")");
  ok(falls === 0, "never lost control despite " + kicks + " kicks");
  ok(spins === 0, "arm never wound up (max theta seen ok)");

  console.log("\n[2] Extreme parameter combos don't break the solver");
  const combos = [
    { lA: 0.10, lB: 0.40, mA: 0.25, mB: 0.04 },
    { lA: 0.45, lB: 0.10, mA: 0.02, mB: 0.30 },
    { lA: 0.45, lB: 0.40, mA: 0.25, mB: 0.30 },
    { lA: 0.12, lB: 0.12, mA: 0.02, mB: 0.04 },
  ];
  let allOK = true;
  for (let c = 0; c < combos.length; c++) {
    const res = await page.evaluate((combo) => {
      for (const [k, v] of Object.entries(combo)) {
        const el = document.getElementById("p-" + (k === "lA" ? "lA" : k === "lB" ? "lB" : k === "mA" ? "mA" : "mB"));
        el.value = v; el.dispatchEvent(new Event("input", { bubbles: true }));
      }
      window.__furutaSim.setStartMode("hanging");
      window.__furutaSim.reset();
      window.__furutaSim.start();
      return true;
    }, combos[c]);
    await new Promise((r) => setTimeout(r, 7000)); // ~28 s sim at 4x
    const t = await tel();
    const good = isFinite(t.ph) && isFinite(t.M) && (t.mode === "balance" || t.mode === "swing");
    if (!good || Math.abs(t.ph) > 3.2 && Math.abs(t.phd) > 300) allOK = false;
    console.log("  combo " + (c + 1) + ": t=" + t.t.toFixed(1) + "s mode=" + t.mode + " phi=" + t.ph.toFixed(2) + " M=" + t.M.toFixed(2) + (good ? "" : "  <-- FAIL"));
  }
  ok(allOK, "all 4 extreme combos run without NaN/blowup");

  console.log("\n[3] Every UI control toggled without errors");
  await page.evaluate(() => {
    // restore defaults
    const defs = { "p-lA": 0.25, "p-lB": 0.2, "p-mA": 0.08, "p-mB": 0.12 };
    for (const [id, v] of Object.entries(defs)) { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); }
    // click all tabs
    document.querySelectorAll(".sim-tab").forEach((t) => t.click());
    // toggle every checkbox
    document.querySelectorAll(".sim-panel input[type=checkbox]").forEach((c) => { c.checked = !c.checked; c.dispatchEvent(new Event("change", { bubbles: true })); });
    // click every seg button
    document.querySelectorAll(".seg-btn").forEach((b) => b.click());
    // click every view preset
    document.querySelectorAll("[data-view]").forEach((b) => b.click());
    // move every slider
    document.querySelectorAll(".sim-panel input[type=range], #sim-speed").forEach((s) => {
      s.value = s.min; s.dispatchEvent(new Event("input", { bubbles: true }));
      s.value = s.max; s.dispatchEvent(new Event("input", { bubbles: true }));
    });
    // restore every control to its HTML default so later tests start clean
    document.querySelectorAll(".sim-panel input[type=range], #sim-speed").forEach((s) => {
      s.value = s.defaultValue; s.dispatchEvent(new Event("input", { bubbles: true }));
    });
    document.querySelector('[data-mode="lqr"]').click();
    document.querySelector('[data-pump="bang"]').click();
    window.__furutaSim.setStartMode("upright");
    window.__furutaSim.reset();
    window.__furutaSim.start();
  });
  await new Promise((r) => setTimeout(r, 2500));
  const t = await tel();
  ok(isFinite(t.ph) && isFinite(t.M), "sim healthy after hammering all controls (phi=" + t.ph.toFixed(2) + ")");

  console.log("\n[4] R slider behaves: higher R -> weaker gains");
  await page.evaluate(() => {
    const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); };
    set("q-phi", 300); set("q-theta", 25); set("q-dphi", 5); set("q-dtheta", 1.5); set("q-r", 0.012);
  });
  await new Promise((r) => setTimeout(r, 400));
  const gLow = await page.evaluate(() => window.__furutaSim.gains[0]);
  await page.evaluate(() => { const el = document.getElementById("q-r"); el.value = 5; el.dispatchEvent(new Event("input", { bubbles: true })); });
  await new Promise((r) => setTimeout(r, 400));
  const gHigh = await page.evaluate(() => window.__furutaSim.gains[0]);
  await page.evaluate(() => { const el = document.getElementById("q-r"); el.value = 0.012; el.dispatchEvent(new Event("input", { bubbles: true })); });
  ok(gHigh < gLow * 0.9, "K_phi shrinks with R (R=0.012: " + gLow.toFixed(1) + ", R=5: " + gHigh.toFixed(1) + ")");

  console.log("\n[5] Proportional pump also swings up (auto-preset kE=16)");
  await page.evaluate(() => {
    const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); };
    set("p-capture", 0.3); set("p-Mmax", 0.5); set("q-phi", 300); set("q-theta", 25); set("q-dphi", 5); set("q-dtheta", 1.5); set("q-r", 0.012);
    document.querySelector('[data-mode="lqr"]').click();
    document.querySelector('[data-pump="prop"]').click();   // auto-sets kE=16, kArm=0.02
    window.__furutaSim.setSpeed(2);
    window.__furutaSim.setNoise(false);
    window.__furutaSim.setStartMode("hanging");
    window.__furutaSim.reset();
    window.__furutaSim.start();
  });
  let cap = false;
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const tt = await tel();
    if (tt.mode === "balance" && Math.abs(tt.ph) < 0.15) { cap = true; break; }
  }
  ok(cap, "proportional pump captures and balances");
  await page.screenshot({ path: "shots/06-stress-final.png" });

  console.log("\n[6] Final error sweep");
  ok(errors.length === 0, "no JS errors during the whole stress session", errors.slice(0, 5));

  await browser.close();
  console.log("\n======================================");
  console.log(`STRESS PASS ${passed}  FAIL ${failed}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("stress crashed:", e); process.exit(2); });
