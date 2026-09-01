/* ============================================================================
 * KaTeX rendering with the exact notation of main.tex:
 *   \vb{r}     -> bold, tilde underneath        (undertilde vector)
 *   \mb{J}     -> bold, underlined              (matrix)
 *   \bas{e}    -> { e_i }                       (orthonormal basis)
 *   \bomega    -> bold upomega with undertilde  (angular velocity)
 *   \upomega   -> upright omega, \uptau -> bold tau, \upvarphi -> phi
 * ========================================================================== */
(function (root) {
  "use strict";

  const macros = {
    "\\vb": "\\underset{\\tilde{} }{\\mathbf{#1}}",
    "\\mb": "\\underline{\\mathbf{#1}}",
    "\\bas": "\\{ \\underset{\\tilde{} }{\\mathbf{#1}}{}_i \\}",
    "\\bomega": "\\underset{\\tilde{} }{\\boldsymbol{\\omega}}",
    "\\upomega": "\\omega",
    "\\uptau": "\\boldsymbol{\\tau}",
    "\\upvarphi": "\\varphi",
  };

  function renderAll(scope) {
    const rootEl = scope || document;
    rootEl.querySelectorAll(".math, .math-display").forEach((el) => {
      if (el.dataset.rendered) return;
      const tex = el.textContent.trim();
      try {
        const display = el.classList.contains("math-display");
        el.innerHTML = katex.renderToString(tex, {
          displayMode: display,
          throwOnError: true,
          macros,
          strict: false,
        });
        el.dataset.rendered = "1";
      } catch (e) {
        el.innerHTML = '<span class="math-error">' + e.message.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</span>";
        console.warn("KaTeX error:", e.message);
      }
    });
  }

  root.FurutaMath = { macros, renderAll };
})(typeof self !== "undefined" ? self : this);
