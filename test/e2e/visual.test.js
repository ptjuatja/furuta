/* Visual & kinematic probes: fonts, canvas pixels, renderer-scene consistency. */
"use strict";
const puppeteer = require("puppeteer-core");

let passed = 0, failed = 0;
function ok(cond, name, extra) {
  if (cond) { passed++; console.log("  \u2713 " + name); }
  else { failed++; console.log("  \u2717 " + name + (extra ? "  -> " + JSON.stringify(extra) : "")); }
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome", headless: "new",
    args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    defaultViewport: { width: 1680, height: 1050 },
  });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:8123/", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 2500));

  console.log("\n[1] Web fonts loaded (vendored, offline-capable)");
  const fonts = await page.evaluate(() => ({
    inter: document.fonts.check('400 16px "Inter"'),
    fraunces: document.fonts.check('600 16px "Fraunces"'),
    plex: document.fonts.check('400 16px "IBM Plex Mono"'),
    caveat: document.fonts.check('600 16px "Caveat"'),
  }));
  ok(fonts.inter, "Inter loaded");
  ok(fonts.fraunces, "Fraunces loaded");
  ok(fonts.plex, "IBM Plex Mono loaded");
  ok(fonts.caveat, "Caveat loaded");

  console.log("\n[2] Fonts served from local repo (no Google CDN dependency)");
  const fontSrcs = await page.evaluate(() => {
    const rules = [];
    for (const sheet of document.styleSheets) {
      try { for (const r of sheet.cssRules) if (r.cssText && /src:/.test(r.cssText)) rules.push(r.cssText); } catch (e) {}
    }
    return rules;
  });
  ok(fontSrcs.length > 20 && fontSrcs.every((s) => /fonts\/[A-Za-z0-9_-]+\.woff2/.test(s)) && !fontSrcs.some((s) => /https?:\/\//.test(s)),
    "font URLs all local (no http)", { count: fontSrcs.length, sample: fontSrcs[0].slice(0, 80) });

  console.log("\n[3] 3D scenes render geometry (three.js draw stats)");
  const canvasStats = await page.evaluate(() => {
    const stats = {};
    for (const s of window.__furutaScenes || []) {
      stats[s.container.id] = {
        triangles: s.renderer.info.render.triangles,
        calls: s.renderer.info.render.calls,
      };
    }
    return stats;
  });
  ok(canvasStats["hero-3d"] && canvasStats["hero-3d"].triangles > 50,
    "hero scene draws geometry (" + JSON.stringify(canvasStats["hero-3d"]) + ")");
  ok(canvasStats["sim-viewport"] && canvasStats["sim-viewport"].triangles > 50,
    "simulator scene draws geometry (" + JSON.stringify(canvasStats["sim-viewport"]) + ")");
  ok(canvasStats["fig-system-3d"] && canvasStats["fig-system-3d"].triangles > 50,
    "derivation scene draws geometry");

  console.log("\n[4] Renderer kinematics match the model (upright / hanging / arm angle)");
  const kin = await page.evaluate(() => {
    const scenes = window.__furutaScenes || [];
    const sim = scenes.find((s) => s.container && s.container.id === "sim-viewport");
    if (!sim) return { err: "no sim scene" };
    const out = {};
    const probe = (th, ph) => {
      sim.setState({ th, ph, thd: 0, phd: 0 }, 0);
      const arm = sim.scene.getObjectByName("armGroup");
      const pend = sim.scene.getObjectByName("pendGroup");
      arm.updateMatrixWorld(true);
      pend.updateMatrixWorld(true);
      const armEnd = new THREE.Vector3(0.2, 0, 0).applyMatrix4(arm.matrixWorld); // arm tip at local (lB, 0, 0)
      const tip = new THREE.Vector3(0, 0.25, 0).applyMatrix4(pend.matrixWorld); // tip sphere at local (0, lA, 0)
      return { arm: { x: +armEnd.x.toFixed(3), z: +armEnd.z.toFixed(3) }, tip: { x: +tip.x.toFixed(3), y: +tip.y.toFixed(3), z: +tip.z.toFixed(3) } };
    };
    out.upright = probe(0, 0);
    out.hanging = probe(0, Math.PI);
    out.quarter = probe(Math.PI / 2, 0);
    return out;
  });
  ok(kin.upright && Math.abs(kin.upright.tip.y - 0.25) < 0.02 && Math.abs(kin.upright.tip.x - 0.2) < 0.02,
    "upright: tip at (lB, lA, 0) = (0.2, 0.25, 0)", kin.upright && kin.upright.tip);
  ok(kin.hanging && Math.abs(kin.hanging.tip.y + 0.25) < 0.02,
    "hanging: tip below joint (y = -lA)", kin.hanging && kin.hanging.tip);
  ok(kin.quarter && Math.abs(kin.quarter.arm.z + 0.2) < 0.02 && Math.abs(kin.quarter.arm.x) < 0.02,
    "theta=90°: arm end at (0,0,-lB) (model: E2=-Z)", kin.quarter && kin.quarter.arm);

  console.log("\n[5] Charts have colored trace pixels (sim running)");
  await page.evaluate(() => { window.__furutaSim.setStartMode("upright"); window.__furutaSim.reset(); window.__furutaSim.start(); });
  await new Promise((r) => setTimeout(r, 2500));
  const chartPix = await page.evaluate(() => {
    const res = {};
    for (const id of ["chart-angles", "chart-torque", "chart-energy"]) {
      const cv = document.getElementById(id);
      const ctx = cv.getContext("2d");
      const img = ctx.getImageData(0, 0, cv.width, cv.height);
      const d = img.data;
      let colored = 0;
      for (let i = 0; i < d.length; i += 16) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        if (mx - mn > 24 && (mx > 60 || mn < 200)) colored++;   // saturated, non-background
      }
      res[id] = colored;
    }
    return res;
  });
  ok(chartPix["chart-angles"] > 20, "angles chart has traces (" + chartPix["chart-angles"] + " sampled px)");
  ok(chartPix["chart-torque"] > 10, "torque chart has traces");
  ok(chartPix["chart-energy"] > 10, "energy chart has traces");

  console.log("\n[6] Paper design tokens applied");
  const styles = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const hero = getComputedStyle(document.querySelector(".hero"));
    return {
      bodyBg: body.backgroundColor,
      bodyFont: body.fontFamily.slice(0, 40),
      heroBg: hero.backgroundImage.slice(0, 60),
    };
  });
  ok(styles.bodyBg === "rgb(248, 245, 239)", "body background is paper #F8F5EF", styles.bodyBg);
  ok(/linear-gradient/.test(styles.heroBg), "hero uses grid-paper gradients");
  ok(/Fraunces/.test(styles.bodyFont) || /Inter/.test(styles.bodyFont), "body uses Inter stack", styles.bodyFont);

  console.log("\n[7] OrbitControls drag works (camera moves on mouse drag)");
  await page.evaluate(() => {
    const el = document.getElementById("sim-viewport");
    const y = el.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top: y, behavior: "instant" });
  });
  await new Promise((r) => setTimeout(r, 400));
  const camBefore = await page.evaluate(() => {
    const sim = (window.__furutaScenes || []).find((s) => s.container.id === "sim-viewport");
    return { x: sim.camera.position.x, y: sim.camera.position.y, z: sim.camera.position.z };
  });
  const vp = await page.evaluate(() => {
    const r = document.getElementById("sim-viewport").getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.move(vp.x + vp.w / 2, vp.y + vp.h / 2);
  await page.mouse.down();
  for (let i = 0; i < 10; i++) { await page.mouse.move(vp.x + vp.w / 2 + i * 8, vp.y + vp.h / 2 + i * 5); await new Promise((r) => setTimeout(r, 30)); }
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 400));
  const camAfter = await page.evaluate(() => {
    const sim = (window.__furutaScenes || []).find((s) => s.container.id === "sim-viewport");
    return { x: sim.camera.position.x, y: sim.camera.position.y, z: sim.camera.position.z };
  });
  const moved = Math.abs(camBefore.x - camAfter.x) + Math.abs(camBefore.y - camAfter.y) + Math.abs(camBefore.z - camAfter.z);
  ok(moved > 0.01, "camera moved after orbit drag (delta=" + moved.toFixed(3) + ")");

  console.log("\n[8] Wheel zoom works");
  await page.mouse.move(vp.x + vp.w / 2, vp.y + vp.h / 2);
  for (let i = 0; i < 5; i++) { await page.mouse.wheel({ deltaY: -120 }); await new Promise((r) => setTimeout(r, 40)); }
  await new Promise((r) => setTimeout(r, 300));
  const camZoom = await page.evaluate(() => {
    const sim = (window.__furutaScenes || []).find((s) => s.container.id === "sim-viewport");
    return sim.camera.position.length();
  });
  const camBeforeDist = Math.sqrt(camBefore.x * camBefore.x + camBefore.y * camBefore.y + camBefore.z * camBefore.z);
  ok(camZoom < camBeforeDist - 0.05, "camera zoomed in after wheel (dist " + camBeforeDist.toFixed(2) + " -> " + camZoom.toFixed(2) + ")");

  console.log("\n[9] View presets");
  await page.evaluate(() => { document.querySelector(".view-buttons [data-view=\"top\"]").click(); });
  await new Promise((r) => setTimeout(r, 400));
  const camTop = await page.evaluate(() => {
    const sim = (window.__furutaScenes || []).find((s) => s.container.id === "sim-viewport");
    return { x: sim.camera.position.x, y: sim.camera.position.y, z: sim.camera.position.z };
  });
  ok(Math.abs(camTop.x) < 0.05 && Math.abs(camTop.z) < 0.05 && camTop.y > 0.5,
    "top view looks straight down", camTop);

  await browser.close();
  console.log("\n======================================");
  console.log(`PROBE PASS ${passed}  FAIL ${failed}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("probe crashed:", e); process.exit(2); });
