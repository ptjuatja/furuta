/* ============================================================================
 * feedback.js — turns the feedback form into an email.
 *
 * The site is static and works offline (no server, no CDN), so the default path
 * is a `mailto:` URL composed in the browser: it opens the visitor's own mail
 * client with the message pre-filled and addressed to CONTACT.to. That needs no
 * account, no key and no network beyond the visitor's own mail provider.
 *
 * To collect submissions server-side instead (Formspree, Web3Forms, Basin, …),
 * set CONTACT.endpoint to the form URL: the page then POSTs JSON and never opens
 * a mail client. Nothing else changes.
 * ========================================================================== */
(function (root) {
  "use strict";

  const CONTACT = {
    to: "ptjuatja@outlook.com",
    endpoint: "",            // e.g. "https://formspree.io/f/xxxxxxxx" — empty = mailto
    maxMailtoLength: 1900,   // some mail clients truncate longer mailto: URLs
  };

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("fb-form");
    if (!form) return;

    const els = {
      name: document.getElementById("fb-name"),
      email: document.getElementById("fb-email"),
      topic: document.getElementById("fb-topic"),
      subject: document.getElementById("fb-subject"),
      message: document.getElementById("fb-message"),
      diag: document.getElementById("fb-diag"),
      trap: document.getElementById("fb-company"),
      status: document.getElementById("fb-status"),
      send: document.getElementById("fb-send"),
      copy: document.getElementById("fb-copy"),
      copyAddr: document.getElementById("fb-copy-addr"),
      addr: document.getElementById("fb-addr"),
    };

    /* A second submit after the "too long" warning goes through anyway — the
     * visitor has been told the risk and may have a client that copes. */
    let forceSend = false;

    /* optional — only present on pages that show the address inline */
    if (els.copyAddr) els.copyAddr.addEventListener("click", async () => {
      const ok = await copyText(CONTACT.to);
      setStatus(ok ? "Address copied." : "Copy failed — the address is " + CONTACT.to + ".",
        ok ? "ok" : "warn");
    });
    if (els.addr) els.addr.textContent = CONTACT.to;

    els.copy.addEventListener("click", async () => {
      const c = compose();
      const ok = await copyText(bodyText(c));
      setStatus(ok
        ? "Copied — paste it into any email to " + CONTACT.to + "."
        : "Could not copy automatically — select the text and copy it.",
        ok ? "ok" : "warn");
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await submit();
    });

    /* re-validate as the visitor fixes things, without nagging while typing */
    [els.email, els.message].forEach((el) => {
      el.addEventListener("input", () => el.removeAttribute("aria-invalid"));
    });

    async function submit() {
      /* bot trap: pretend success so the bot moves on */
      if (els.trap && els.trap.value.trim()) {
        setStatus("Thanks — your message is on its way.", "ok");
        return;
      }

      const message = els.message.value.trim();
      if (!message) {
        els.message.setAttribute("aria-invalid", "true");
        els.message.focus();
        setStatus("Add a message first — that is the part I can act on.", "err");
        return;
      }

      const email = els.email.value.trim();
      if (email && !EMAIL_RE.test(email)) {
        els.email.setAttribute("aria-invalid", "true");
        els.email.focus();
        setStatus("That reply address looks off — fix it, or leave it blank.", "err");
        return;
      }

      const c = compose();

      if (CONTACT.endpoint) {
        setStatus("Sending…", "");
        els.send.disabled = true;
        try {
          const res = await fetch(CONTACT.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              name: c.name, email: c.email, topic: c.topic,
              subject: c.subject, message: c.message, meta: c.diag,
              _subject: c.subject,
            }),
          });
          if (!res.ok) throw new Error("HTTP " + res.status);
          form.reset();
          setStatus("Thanks — your message is on its way.", "ok");
        } catch (err) {
          setStatus("Could not send that (" + err.message + "). Use Copy message, or email "
            + CONTACT.to + " directly.", "err");
        } finally {
          els.send.disabled = false;
        }
        return;
      }

      const url = buildMailto(c);
      if (url.length > CONTACT.maxMailtoLength && !forceSend) {
        forceSend = true;
        setStatus("That message is long for a mail link and may get cut off. Press again to try "
          + "anyway, or use Copy message and paste it into an email to " + CONTACT.to + ".",
          "warn");
        return;
      }

      openMailto(url);
      setStatus("Opening your mail app — send it from there and it reaches me. Nothing happened? "
        + "Use Copy message.", "ok");
    }

    /* ---------------------------------------------------------------- */

    function compose() {
      const name = els.name.value.trim();
      const email = els.email.value.trim();
      const topic = els.topic.value;
      const message = els.message.value.trim();
      const custom = els.subject.value.trim();

      const snippet = message.split("\n")[0].slice(0, 56).trim();
      const tail = custom || snippet;
      const subject = "[Furuta Lab] " + topic + (tail ? " — " + tail : "");

      return {
        name, email, topic, message, subject,
        diag: els.diag && els.diag.checked ? diagnostics() : null,
      };
    }

    function diagnostics() {
      return {
        page: root.location.href,
        client: root.navigator.userAgent,
        view: root.innerWidth + " × " + root.innerHeight,
        sent: new Date().toISOString(),
      };
    }

    function bodyText(c) {
      const lines = [c.message, ""];
      const meta = [];
      meta.push(["Topic", c.topic]);
      if (c.name || c.email) {
        meta.push(["From", c.email ? (c.name ? c.name + " <" + c.email + ">" : c.email) : c.name]);
      }
      if (c.diag) {
        meta.push(["Page", c.diag.page]);
        meta.push(["Client", c.diag.client]);
        meta.push(["View", c.diag.view]);
        meta.push(["Sent", c.diag.sent]);
      }
      lines.push("--");
      const width = meta.reduce((w, m) => Math.max(w, m[0].length), 0);
      meta.forEach((m) => lines.push(m[0].padEnd(width) + " : " + m[1]));
      return lines.join("\n");
    }

    function buildMailto(c) {
      return "mailto:" + CONTACT.to
        + "?subject=" + encodeURIComponent(c.subject)
        + "&body=" + encodeURIComponent(bodyText(c));
    }

    function openMailto(url) {
      /* an anchor click is the most reliable cross-browser hand-off, and unlike
       * location.href it never triggers an unload prompt on the current page */
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    function setStatus(text, state) {
      els.status.textContent = text;
      if (state) els.status.setAttribute("data-state", state);
      else els.status.removeAttribute("data-state");
    }

    async function copyText(text) {
      try {
        if (root.navigator.clipboard && root.isSecureContext) {
          await root.navigator.clipboard.writeText(text);
          return true;
        }
      } catch (err) { /* fall through to the legacy path */ }

      /* works on file:// and other non-secure origins, where the async
       * clipboard API is unavailable */
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      ta.remove();
      return ok;
    }

    /* hook for the e2e suite (mirrors window.__furutaSim) */
    root.__furutaFeedback = {
      config: CONTACT,
      compose,
      bodyText,
      buildMailto,
      setStatus,
    };
  });
})(typeof self !== "undefined" ? self : this);
