# Verified bibliography — rotary inverted (Furuta) pendulum report

Verification protocol actually executed (2026-10-07), per reference below:

1. Crossref REST query by title: `https://api.crossref.org/works?query.bibliographic=<title>&rows=4`.
   **All URLs listed below were used with this exact suffix appended:**
   `&select=DOI,title,author,container-title,volume,issue,page,issued,type,publisher,ISBN,event`.
2. Record matched on title + first author + container + year; **all metadata strings below were copied from the API
   response**, not retyped from memory.
3. DOI resolution checked with `curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n' -L https://doi.org/<DOI>`.
   Statuses 403 / 202 are publisher anti-bot responses (SAGE, ASME, SIAM, Taylor & Francis, IEEE, De Gruyter) on a
   *valid* redirect: the final URL is the exact landing page of the cited work. Where a status was 200 the direct
   landing page is recorded.
4. Works with no DOI were accepted only against a fetched reliable source (zbMATH Open API / EuDML / publisher page /
   OpenLibrary edition record / Internet Archive catalogue record), named explicitly per entry.
5. No ISBN, DOI, page range or year below is invented; anything not confirmable was rejected (see last section).

## Verified references

**Furuta1992PseudoState** — article — topic 1
- authors: `Furuta, K. and Yamakita, M. and Kobayashi, S.`
- title: `Swing-up Control of Inverted Pendulum Using Pseudo-State Feedback`
- container: Proceedings of the Institution of Mechanical Engineers, Part I: Journal of Systems and Control Engineering (SAGE Publications), vol. 206, no. 4, pp. 263–269, 1992-11
- DOI: `10.1243/pime_proc_1992_206_341_02` — HTTP `403` (SAGE bot-blocked landing page), final URL `https://journals.sagepub.com/doi/10.1243/PIME_PROC_1992_206_341_02`
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=Swing-up+control+of+inverted+pendulum+using+pseudo-state+feedback&rows=4` — returned title exactly `Swing-up Control of Inverted Pendulum Using Pseudo-State Feedback` (DOI matched)
- relevance: the original Furuta swing-up-by-pseudo-state-feedback paper — the benchmark identity of the plant.

**Furuta1991IECON** — inproceedings — topic 1
- authors: `Furuta, K. and Yamakita, M. and Kobayashi, S.`
- title: `Swing up control of inverted pendulum`
- container: Proceedings IECON '91: 1991 International Conference on Industrial Electronics, Control and Instrumentation (IEEE), pp. 2193–2198, 1991 — **Crossref `issued` is empty; the year 1991 is taken from the returned proceedings/event title**, not invented
- DOI: `10.1109/iecon.1991.239008` — HTTP `202`, final URL `https://ieeexplore.ieee.org/document/239008/`
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=Swing+up+control+of+inverted+pendulum+Furuta+IECON+1991&rows=4` — returned title exactly `Swing up control of inverted pendulum` (DOI matched)
- relevance: conference precursor of the 1992 paper; earliest swing-up formulation of the rotary inverted pendulum.

**FantoniLozano2002** — book — topic 2
- authors: `Fantoni, Isabelle and Lozano, Rogelio`
- title: `Non-linear Control for Underactuated Mechanical Systems`
- container/series: Communications and Control Engineering, Springer London, 2002, ISBN (as returned) `9781447110866`, `9781447101772`
- DOI: `10.1007/978-1-4471-0177-2` — HTTP `200`, final URL `https://link.springer.com/book/10.1007/978-1-4471-0177-2` (Springer appends `?error=cookies_not_supported&code=...`)
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=Non-linear+Control+for+Underactuated+Mechanical+Systems&rows=4` — returned title exactly `Non-linear Control for Underactuated Mechanical Systems` (DOI matched)
- relevance: canonical modern book treatment of the Furuta pendulum (energy shaping, swing-up, passivity).

**AstromFuruta2000** — article — topic 3
- authors: `Åström, K.J. and Furuta, K.`
- title: `Swinging up a pendulum by energy control`
- container: Automatica (Elsevier BV), vol. 36, no. 2, pp. 287–295, 2000-02
- DOI: `10.1016/s0005-1098(99)00140-5` — HTTP `200`, final URL `https://linkinghub.elsevier.com/retrieve/pii/S0005109899001405`
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=Swinging+up+a+pendulum+by+energy+control&rows=4` — returned title exactly `Swinging up a pendulum by energy control` (DOI matched)
- relevance: the reference energy-pumping swing-up law and the capture/switch condition used by the report's FSM.

**Spong1996Energy** — article — topic 3
- authors: `Spong, Mark W.`
- title: `Energy Based Control of a Class of Underactuated Mechanical Systems`
- container: IFAC Proceedings Volumes (Elsevier BV), vol. 29, no. 1, pp. 2828–2832, 1996-06
- DOI: `10.1016/s1474-6670(17)58105-7` — HTTP `200`, final URL `https://linkinghub.elsevier.com/retrieve/pii/S1474667017581057`
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=Energy+based+control+of+a+class+of+underactuated+mechanical+systems+Spong&rows=4` — returned title exactly `Energy Based Control of a Class of Underactuated Mechanical Systems` (DOI matched)
- relevance: energy-based (Lyapunov) swing-up for the general underactuated class, incl. torque-limited variants.

**Kalman1960Contributions** — article — topic 4 — **no DOI**
- authors: `Kalman, R. E.`
- title: `Contributions to the theory of optimal control`
- container: Boletín de la Sociedad Matemática Mexicana, II. Ser., vol. 5, pp. 102–119, 1960 (erratum ibid. 5, 299)
- DOI: none — existence and bibliographic data verified from the **zbMATH Open API** record fetched at `https://api.zbmath.org/v1/document/_search?search_string=Contributions+to+the+theory+of+optimal+control+Kalman&results_per_page=3`, zbMATH id `0112.06303`, record page `https://zbmath.org/3181381`; zbMATH source string returned verbatim: `Bol. Soc. Mat. Mex., II. Ser. 5, 102-119 (1960); erratum. Ibid. 5, 299 (1960).`
- relevance: the primal LQR/optimal-regulation paper (Riccati-equation solution of the linear-quadratic problem).

**AndersonMoore1990** — book — topic 4 — **no DOI**
- authors: `Anderson, Brian D. O. and Moore, John B.`
- title: `Optimal control. Linear quadratic methods`
- publisher: Prentice Hall Information and System Sciences Series, Englewood Cliffs, NJ, 1990, xi + 380 p., ISBN `0-13-638560-5` (pbk)
- DOI: none — verified from the **zbMATH Open API** record (id `0751.49013`, `https://zbmath.org/53439`); the 2007 Dover reprint `Optimal Control: Linear Quadratic Methods`, ISBN `978-0-486-45766-6`, is confirmed by the fetched OpenLibrary edition record `https://openlibrary.org/isbn/0486457664.json`
- relevance: standard textbook derivation of the LQ regulator, Hamiltonian/costate conditions and ARE.

**Kalman1964WhenIs** — article — topic 4
- authors: `Kalman, R. E.`
- title: `When Is a Linear Control System Optimal?`
- container: Journal of Basic Engineering (ASME International), vol. 86, no. 1, pp. 51–60, 1964-03-01
- DOI: `10.1115/1.3653115` — HTTP `403` (ASME bot-blocked), final URL `https://asmedigitalcollection.asme.org/fluidsengineering/article/86/1/51/392203/When-Is-a-Linear-Control-System-Optimal`
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=When+is+a+linear+control+system+optimal+Kalman&rows=4` — returned title exactly `When Is a Linear Control System Optimal?` (DOI matched)
- relevance: inverse LQR result (which feedback gains are optimal for some Q, R) — justifies interpreting the computed gain as an LQR gain.

**Pontryagin1962** — book — topic 5 — **no DOI**
- authors: `Pontryagin, L. S. and Boltyanskii, V. G. and Gamkrelidze, R. V. and Mishchenko, E. F.`
- title: `The Mathematical Theory of Optimal Processes`
- publisher: Interscience Publishers, New York, 1962, viii + 360 p.
- DOI: none — verified from the **Internet Archive catalogue record** fetched at `https://archive.org/metadata/mathematicaltheo0000pont` (title `The mathematical theory of optimal processes`, creator `Pontri͡agin, L. S.`, publisher `New York, Interscience Publishers`, date `1962`, `viii, 360 p. 24 cm`); existence of the work is also confirmed by the Crossref-indexed review records `10.2307/2312867` (Amer. Math. Monthly) and `10.2307/1911909` (Econometrica, whose returned author list also contains `Trirogoff, K. N.` and `Neustadt, L. W.`, the translator/editor of the English edition)
- relevance: the maximum principle (Hamiltonian, costate equation, stationarity) used in the continuous-time LQR derivation.

**Kleinman1968** — article — topic 6
- authors: `Kleinman, D.`
- title: `On an iterative technique for Riccati equation computations`
- container: IEEE Transactions on Automatic Control, vol. 13, no. 1, pp. 114–115, 1968-02
- DOI: `10.1109/tac.1968.1098829` — HTTP `202`, final URL `https://ieeexplore.ieee.org/document/1098829/`
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=On+an+iterative+technique+for+Riccati+equation+computations&rows=4` — returned title exactly `On an iterative technique for Riccati equation computations` (DOI matched)
- relevance: the Kleinman-type Newton/fixed-point iteration for the ARE and its convergence — the direct ancestor of the report's iterate-until-relative-tolerance scheme.

**Potter1966** — article — topic 6
- authors: `Potter, James E.`
- title: `Matrix Quadratic Solutions`
- container: SIAM Journal on Applied Mathematics, vol. 14, no. 3, pp. 496–501, 1966-03
- DOI: `10.1137/0114044` — HTTP `403` (SIAM bot-blocked), final URL `https://epubs.siam.org/doi/10.1137/0114044`
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=Matrix+quadratic+solutions+Potter&rows=4` — returned title exactly `Matrix Quadratic Solutions` (DOI matched)
- relevance: eigenvector-based solution of the matrix quadratic (Riccati) equation — background for ARE solvability.

**KuceraARE1991** — book chapter (incollection) — topic 6
- authors: `Kučera, Vladimír`
- title: `Algebraic Riccati Equation: Hermitian and Definite Solutions`
- container: The Riccati Equation (Communications and Control Engineering), Springer Berlin Heidelberg, pp. 53–88, 1991, ISBN (as returned) `9783642635083`, `9783642582233`
- DOI: `10.1007/978-3-642-58223-3_3` — HTTP `200`, final URL `https://link.springer.com/chapter/10.1007/978-3-642-58223-3_3`
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=Algebraic+Riccati+Equation%3A+Hermitian+and+Definite+Solutions&rows=4` — returned title exactly `Algebraic Riccati Equation: Hermitian and Definite Solutions` (DOI matched)
- relevance: classification of Hermitian/definite solutions of the ARE, including the stabilising one.

**CainesMayne1970** — article — topic 7
- authors: `Caines, P. E. and Mayne, D. Q.`
- title (as returned, incl. Crossref footnote dagger): `On the discrete time matrix Riccati equation of optimal control†` — the `†` is a Crossref footnote marker and should be dropped in the bibliography
- container: International Journal of Control (Informa UK Limited), vol. 12, no. 5, pp. 785–794, 1970-11
- DOI: `10.1080/00207177008931892` — HTTP `403` (Taylor & Francis bot-blocked), final URL `https://www.tandfonline.com/doi/abs/10.1080/00207177008931892`
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=On+the+discrete+time+matrix+Riccati+equation+of+optimal+control&rows=4` — returned title exactly as quoted above (DOI matched)
- relevance: convergence/monotonicity of the discrete Riccati recursion and conditions for the stabilising solution (the report's P0 = Q, monotone convergence discussion).

**Molinari1975** — article — topic 7
- authors: `Molinari, B.`
- title (as returned, sentence case, lowercase "riccati"): `The stabilizing solution of the discrete algebraic riccati equation`
- container: IEEE Transactions on Automatic Control, vol. 20, no. 3, pp. 396–399, 1975-06
- DOI: `10.1109/tac.1975.1100983` — HTTP `202`, final URL `https://ieeexplore.ieee.org/document/1100983/`
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=The+stabilizing+solution+of+the+discrete+algebraic+Riccati+equation+Molinari&rows=4` — returned title exactly as quoted above (DOI matched)
- relevance: existence/uniqueness of the stabilising solution of the discrete ARE under stabilisability/detectability.

**Kucera1972** — article — topic 7 — **no DOI**
- authors: `Kučera, Vladimír`
- title: `The discrete Riccati equation of optimal control`
- container: Kybernetika (Praha), vol. 08, no. 5, pp. 430–447, 1972, ISSN 0023-5954
- DOI: none (not indexed in Crossref) — verified from the **EuDML article page fetched with HTTP 200** at `https://eudml.org/doc/28850`, which returned verbatim: `The discrete Riccati equation of optimal control — Vladimír Kučera — Kybernetika (1972) Volume: 08, Issue: 5, page (430)-447 — ISSN: 0023-5954`; corroborated by the zbMATH Open record id `0245.93033`, `https://zbmath.org/3388902`
- relevance: polynomial/frequency-domain treatment of the discrete Riccati equation and its stabilising solution.

**Laub1979** — article — topic 8
- authors: `Laub, A.`
- title: `A Schur method for solving algebraic Riccati equations`
- container: IEEE Transactions on Automatic Control, vol. 24, no. 6, pp. 913–921, 1979-12
- DOI: `10.1109/tac.1979.1102178` — HTTP `202`, final URL `https://ieeexplore.ieee.org/document/1102178/`
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=A+Schur+method+for+solving+algebraic+Riccati+equations&rows=4` — returned title exactly `A Schur method for solving algebraic Riccati equations` (DOI matched)
- relevance: direct (non-iterative) Schur/Schur-vector solution of the ARE — the alternative to the report's fixed-point iteration.

**MolerVanLoan2003** — article — topic 9
- authors: `Moler, Cleve and Van Loan, Charles`
- title: `Nineteen Dubious Ways to Compute the Exponential of a Matrix, Twenty-Five Years Later`
- container: SIAM Review, vol. 45, no. 1, pp. 3–49, 2003-01
- DOI: `10.1137/s00361445024180` — HTTP `403` (SIAM bot-blocked), final URL `https://epubs.siam.org/doi/10.1137/S00361445024180`
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=Nineteen+dubious+ways+to+compute+the+exponential+of+a+matrix+twenty-five+years+later&rows=4` — returned title exactly `Nineteen Dubious Ways to Compute the Exponential of a Matrix, Twenty-Five Years Later` (DOI matched)
- relevance: survey of matrix-exponential algorithms, incl. scaling-and-squaring and Taylor/Padé truncation error.

**Higham2005** — article — topic 9
- authors: `Higham, Nicholas J.`
- title: `The Scaling and Squaring Method for the Matrix Exponential Revisited`
- container: SIAM Journal on Matrix Analysis and Applications, vol. 26, no. 4, pp. 1179–1193, 2005
- DOI: `10.1137/04061101x` — HTTP `403` (SIAM bot-blocked), final URL `https://epubs.siam.org/doi/10.1137/04061101X`
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=The+scaling+and+squaring+method+for+the+matrix+exponential+revisited&rows=4` — returned title exactly `The Scaling and Squaring Method for the Matrix Exponential Revisited` (DOI matched)
- relevance: rigorous backward-error/degree analysis of scaling-and-squaring — supports the report's exp(A·dt) implementation.

**VanLoan1978** — article — topic 10
- authors: `Van Loan, C.`
- title: `Computing integrals involving the matrix exponential`
- container: IEEE Transactions on Automatic Control, vol. 23, no. 3, pp. 395–404, 1978-06
- DOI: `10.1109/tac.1978.1101743` — HTTP `202`, final URL `https://ieeexplore.ieee.org/document/1101743/`
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=Computing+integrals+involving+the+matrix+exponential+Van+Loan&rows=4` — returned title exactly `Computing integrals involving the matrix exponential` (DOI matched)
- relevance: computation of ∫exp(Aσ)B dσ (the report's B_d series / augmented-matrix trick).

**AstromWittenmark2011** — book — topic 11 — **no DOI**
- authors: `Åström, Karl J. and Wittenmark, Björn`
- title: `Computer-Controlled Systems: Theory and Design`, 3rd ed.
- publisher: Dover Publications, 2011, ISBN `978-0-486-48613-0`
- DOI: none — verified from the **OpenLibrary edition record fetched at `https://openlibrary.org/isbn/9780486486130.json`** (title `Computer-controlled systems`, subtitle `theory and design`, `edition_name: 3rd ed`, `by_statement: Karl J. Åström, Björn Wittenmark`, publisher Dover Publications, 2011). The Prentice Hall printing of the same 3rd edition (ISBN `0-13-314899-8`, 555 p.) is in the fetched record `https://openlibrary.org/isbn/0133148998.json`, whose `publish_date` is `November 20, 1996`.
- relevance: sampled-data/ZOH discretisation, discrete-time pole placement and digital regulator design.

**FranklinPowellWorkman1998** — book — topic 11 — **no DOI**
- authors: `Franklin, Gene F. and Powell, J. David and Workman, Michael L.`
- title: `Digital Control of Dynamic Systems`, 3rd ed.
- publisher: Addison-Wesley, 1998, xxiii + 742 p., ISBN `0-201-82054-4`
- DOI: none — verified from the **OpenLibrary edition record fetched at `https://openlibrary.org/isbn/0201820544.json`** (`3rd ed.`, `by_statement: Gene F. Franklin, J. David Powell, Michael L. Workman.`, Addison Wesley, 1998, 742 p.); the 2nd edition (Addison-Wesley, 1990, ISBN `0-201-11938-2`) is a zbMATH Open record, id `0697.93002`, `https://zbmath.org/194427`
- relevance: ZOH discretisation of continuous plants, digital LQR and the discrete Riccati recursion.

**ChenFrancis1995** — book — topic 11
- authors: `Chen, Tongwen and Francis, Bruce Allen`
- title: `Optimal Sampled-Data Control Systems`
- publisher: Springer London, 1995, ISBN (as returned) `9781447130390`, `9781447130376`
- DOI: `10.1007/978-1-4471-3037-6` — HTTP `200`, final URL `https://link.springer.com/book/10.1007/978-1-4471-3037-6` (first attempt aborted with a transient TLS error, `000`; immediate retry returned `200`)
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=Optimal+Sampled-Data+Control+Systems+Chen+Francis&rows=4` — returned title exactly `Optimal Sampled-Data Control Systems` (DOI matched)
- relevance: rigorous sampled-data optimal control (lifting), i.e. why the ZOH-discretised LQR is the right digital limit.

**Spong1994PFL** — article — topic 12
- authors: `Spong, Mark W.`
- title (as returned, incl. trailing footnote marker): `Swing up control of the acrobot using partial feedback linearization *` — the trailing ` *` is a footnote marker and should be dropped in the bibliography
- container: IFAC Proceedings Volumes (Elsevier BV), vol. 27, no. 14, pp. 833–838, 1994-09
- DOI: `10.1016/s1474-6670(17)47404-0` — HTTP `200`, final URL `https://linkinghub.elsevier.com/retrieve/pii/S1474667017474040`
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=Swing+up+control+of+the+acrobot+using+partial+feedback+linearization&rows=4` — returned title exactly as quoted above (DOI matched)
- relevance: partial feedback linearisation + swing-up of an underactuated two-link chain (acrobot) — the methodological twin of the two-bar rotary pendulum.

**Spong1995Acrobot** — article — topic 12 — see caveat on authors
- authors: **Crossref returns an empty author list for this record.** Authorship was therefore confirmed from a second fetched API: `https://api.openalex.org/works/doi:10.1109/37.341864` returned `"authors": ["Mark W. Spong"]`, `"year": 1995`, `"biblio": {"volume":"15","issue":"1","first_page":"49","last_page":"55"}`
- title: `The swing up control problem for the Acrobot`
- container: IEEE Control Systems (IEEE), vol. 15, no. 1, pp. 49–55, 1995-02
- DOI: `10.1109/37.341864` — HTTP `202`, final URL `https://ieeexplore.ieee.org/document/341864/`
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=The+swing+up+control+problem+for+the+Acrobot+Spong&rows=4` — returned title exactly `The swing up control problem for the Acrobot` (DOI matched; author field empty)
- relevance: canonical energy-based swing-up with a finite-state switch to balancing — the template for the report's swing-up/FSM/LQR structure.

**OrioloNakamura1991** — inproceedings — topic 12
- authors: `Oriolo, G. and Nakamura, Y.`
- title: `Control of mechanical systems with second-order nonholonomic constraints: underactuated manipulators`
- container: [1991] Proceedings of the 30th IEEE Conference on Decision and Control (IEEE), pp. 2398–2403, 1991 — **Crossref `issued` is empty; the year 1991 is taken from the returned proceedings title**
- DOI: `10.1109/cdc.1991.261620` — HTTP `202`, final URL `https://ieeexplore.ieee.org/document/261620/`
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=Control+of+mechanical+systems+with+second-order+nonholonomic+constraints+underactuated+manipulators+Oriolo+Nakamura&rows=4` — returned title exactly as quoted above (DOI matched)
- relevance: structural theory of underactuated mechanical systems (second-order nonholonomic constraints) — why the pendulum angle is not directly actuated.

**Goldstein2002** — book — topic 13 — **no DOI**
- authors: `Goldstein, Herbert and Poole, Charles P. and Safko, John L.`
- title: `Classical Mechanics`, 3rd ed.
- publisher: Addison-Wesley (Pearson), 2002, 680 p., ISBN `978-0-201-65702-9`
- DOI: none — verified from the **OpenLibrary edition record fetched at `https://openlibrary.org/isbn/0201657023.json`** (`Classical Mechanics (3rd Edition)`, Addison Wesley, 2002-01-15, 680 p., ISBN 9780201657029); corroborated by the Crossref-indexed review record `10.1119/1.1484149` (Amer. J. Phys. 70(7):782–783, 2002), whose returned author list begins `Goldstein, Herbert; Poole, Charles; Safko, John` (the record also lists the reviewer, `Addison, Stephen R.`)
- relevance: textbook Lagrange/Hamilton formalism to accompany the analytical-dynamics handout.

**Lanczos1949** — book — topic 13
- authors: `Lanczos, Cornelius`
- title: `The Variational Principles of Mechanics`
- publisher: University of Toronto Press, 1949 (Crossref `issued` = 1949-12-31), ISBN (as returned) `9781487583057`
- DOI: `10.3138/9781487583057` — HTTP `202`, final URL `https://www.degruyterbrill.com/document/doi/10.3138/9781487583057/html`
- Crossref API URL: `https://api.crossref.org/works?query.bibliographic=The+Variational+Principles+of+Mechanics+Lanczos&rows=4` — returned title exactly `The Variational Principles of Mechanics` (DOI matched; Crossref type `edited-book`)
- relevance: variational derivation of Lagrange's equations and generalised coordinates/inertia treatment.

**Greenwood1987** — book — topic 13 — **no DOI**
- authors: `Greenwood, Donald T.`
- title: `Principles of Dynamics`, 2nd ed.
- publisher: Prentice Hall, 1987, 576 p., ISBN `0-13-709981-9`
- DOI: none — verified from the **OpenLibrary edition record fetched at `https://openlibrary.org/isbn/0137099819.json`** (`Principles of Dynamics, Second Edition`, Prentice Hall, 1987-07-13, 576 p.); the 1st edition (Prentice-Hall, Englewood Cliffs, 1965, x + 518 pp.) is confirmed by the Crossref-indexed review records `10.1126/science.148.3671.810-a` and `10.1126/science.148.3678.1712.b`
- relevance: engineering-dynamics treatment of rigid-body inertia and Lagrange's equations for multibody systems.

**Bertsekas2017** — book — topic 14 — **no DOI**
- authors: `Bertsekas, Dimitri P.`
- title: `Dynamic Programming and Optimal Control, Vol. I`, 4th ed.
- publisher: Athena Scientific, 2017, 576 p., hardcover, ISBN `978-1-886529-43-4`
- DOI: none — verified from the **publisher page fetched with HTTP 200 at `http://www.athenasc.com/dpbook.html`** (returned verbatim: `Vol. I, 4TH EDITION, 2017, 576 pages, hardcover` and `ISBN10: 1-886529-43-4 or ISBN13: 978-1-886529-43-4`); also OpenLibrary edition `https://openlibrary.org/isbn/9781886529434.json`
- relevance: discrete-time optimal control/dynamic programming, DP recursion and the discrete Riccati recursion.

## BibTeX

```bibtex
@article{Furuta1992PseudoState,
  author  = {Furuta, K. and Yamakita, M. and Kobayashi, S.},
  title   = {Swing-up Control of Inverted Pendulum Using Pseudo-State Feedback},
  journal = {Proceedings of the Institution of Mechanical Engineers, Part I: Journal of Systems and Control Engineering},
  volume  = {206},
  number  = {4},
  pages   = {263--269},
  year    = {1992},
  doi     = {10.1243/pime_proc_1992_206_341_02},
}

@inproceedings{Furuta1991IECON,
  author    = {Furuta, K. and Yamakita, M. and Kobayashi, S.},
  title     = {Swing up control of inverted pendulum},
  booktitle = {Proceedings IECON '91: 1991 International Conference on Industrial Electronics, Control and Instrumentation},
  pages     = {2193--2198},
  year      = {1991},
  publisher = {IEEE},
  doi       = {10.1109/iecon.1991.239008},
  note      = {Crossref has no issued date for this record; year taken from the proceedings title},
}

@book{FantoniLozano2002,
  author    = {Fantoni, Isabelle and Lozano, Rogelio},
  title     = {Non-linear Control for Underactuated Mechanical Systems},
  series    = {Communications and Control Engineering},
  publisher = {Springer London},
  year      = {2002},
  isbn      = {9781447110866},
  doi       = {10.1007/978-1-4471-0177-2},
}

@article{AstromFuruta2000,
  author  = {{\AA}str{\"o}m, K.J. and Furuta, K.},
  title   = {Swinging up a pendulum by energy control},
  journal = {Automatica},
  volume  = {36},
  number  = {2},
  pages   = {287--295},
  year    = {2000},
  doi     = {10.1016/s0005-1098(99)00140-5},
}

@article{Spong1996Energy,
  author  = {Spong, Mark W.},
  title   = {Energy Based Control of a Class of Underactuated Mechanical Systems},
  journal = {IFAC Proceedings Volumes},
  volume  = {29},
  number  = {1},
  pages   = {2828--2832},
  year    = {1996},
  doi     = {10.1016/s1474-6670(17)58105-7},
}

@article{Kalman1960Contributions,
  author  = {Kalman, R. E.},
  title   = {Contributions to the theory of optimal control},
  journal = {Bolet{\'i}n de la Sociedad Matem{\'a}tica Mexicana, II. Ser.},
  volume  = {5},
  pages   = {102--119},
  year    = {1960},
  note    = {No DOI; verified via zbMATH Open record 0112.06303},
}

@book{AndersonMoore1990,
  author    = {Anderson, Brian D. O. and Moore, John B.},
  title     = {Optimal control. Linear quadratic methods},
  series    = {Prentice Hall Information and System Sciences Series},
  publisher = {Prentice Hall},
  address   = {Englewood Cliffs, NJ},
  year      = {1990},
  isbn      = {0-13-638560-5},
  note      = {No DOI; verified via zbMATH Open record 0751.49013. Dover reprint 2007, ISBN 978-0-486-45766-6},
}

@article{Kalman1964WhenIs,
  author  = {Kalman, R. E.},
  title   = {When Is a Linear Control System Optimal?},
  journal = {Journal of Basic Engineering},
  volume  = {86},
  number  = {1},
  pages   = {51--60},
  year    = {1964},
  doi     = {10.1115/1.3653115},
}

@book{Pontryagin1962,
  author    = {Pontryagin, L. S. and Boltyanskii, V. G. and Gamkrelidze, R. V. and Mishchenko, E. F.},
  title     = {The Mathematical Theory of Optimal Processes},
  publisher = {Interscience Publishers},
  address   = {New York},
  year      = {1962},
  note      = {No DOI; verified via Internet Archive record mathematicaltheo0000pont},
}

@article{Kleinman1968,
  author  = {Kleinman, D.},
  title   = {On an iterative technique for Riccati equation computations},
  journal = {IEEE Transactions on Automatic Control},
  volume  = {13},
  number  = {1},
  pages   = {114--115},
  year    = {1968},
  doi     = {10.1109/tac.1968.1098829},
}

@article{Potter1966,
  author  = {Potter, James E.},
  title   = {Matrix Quadratic Solutions},
  journal = {SIAM Journal on Applied Mathematics},
  volume  = {14},
  number  = {3},
  pages   = {496--501},
  year    = {1966},
  doi     = {10.1137/0114044},
}

@incollection{KuceraARE1991,
  author    = {Ku{\v{c}}era, Vladim{\'i}r},
  title     = {Algebraic Riccati Equation: Hermitian and Definite Solutions},
  booktitle = {The Riccati Equation},
  series    = {Communications and Control Engineering},
  publisher = {Springer Berlin Heidelberg},
  pages     = {53--88},
  year      = {1991},
  isbn      = {9783642582233},
  doi       = {10.1007/978-3-642-58223-3_3},
}

@article{CainesMayne1970,
  author  = {Caines, P. E. and Mayne, D. Q.},
  title   = {On the discrete time matrix Riccati equation of optimal control},
  journal = {International Journal of Control},
  volume  = {12},
  number  = {5},
  pages   = {785--794},
  year    = {1970},
  doi     = {10.1080/00207177008931892},
  note    = {Crossref title carries a footnote dagger; dropped here. Correction note: ibid. 14(1):205--207, 1971, doi 10.1080/00207177108932032},
}

@article{Molinari1975,
  author  = {Molinari, B.},
  title   = {The stabilizing solution of the discrete algebraic Riccati equation},
  journal = {IEEE Transactions on Automatic Control},
  volume  = {20},
  number  = {3},
  pages   = {396--399},
  year    = {1975},
  doi     = {10.1109/tac.1975.1100983},
  note    = {Crossref stores the title in sentence case with lowercase ``riccati''},
}

@article{Kucera1972,
  author  = {Ku{\v{c}}era, Vladim{\'i}r},
  title   = {The discrete Riccati equation of optimal control},
  journal = {Kybernetika},
  volume  = {8},
  number  = {5},
  pages   = {430--447},
  year    = {1972},
  issn    = {0023-5954},
  note    = {No DOI; verified via EuDML record https://eudml.org/doc/28850 and zbMATH 0245.93033},
}

@article{Laub1979,
  author  = {Laub, A.},
  title   = {A Schur method for solving algebraic Riccati equations},
  journal = {IEEE Transactions on Automatic Control},
  volume  = {24},
  number  = {6},
  pages   = {913--921},
  year    = {1979},
  doi     = {10.1109/tac.1979.1102178},
}

@article{MolerVanLoan2003,
  author  = {Moler, Cleve and Van Loan, Charles},
  title   = {Nineteen Dubious Ways to Compute the Exponential of a Matrix, Twenty-Five Years Later},
  journal = {SIAM Review},
  volume  = {45},
  number  = {1},
  pages   = {3--49},
  year    = {2003},
  doi     = {10.1137/s00361445024180},
}

@article{Higham2005,
  author  = {Higham, Nicholas J.},
  title   = {The Scaling and Squaring Method for the Matrix Exponential Revisited},
  journal = {SIAM Journal on Matrix Analysis and Applications},
  volume  = {26},
  number  = {4},
  pages   = {1179--1193},
  year    = {2005},
  doi     = {10.1137/04061101x},
}

@article{VanLoan1978,
  author  = {Van Loan, C.},
  title   = {Computing integrals involving the matrix exponential},
  journal = {IEEE Transactions on Automatic Control},
  volume  = {23},
  number  = {3},
  pages   = {395--404},
  year    = {1978},
  doi     = {10.1109/tac.1978.1101743},
}

@book{AstromWittenmark2011,
  author    = {{\AA}str{\"o}m, Karl J. and Wittenmark, Bj{\"o}rn},
  title     = {Computer-Controlled Systems: Theory and Design},
  edition   = {3rd},
  publisher = {Dover Publications},
  year      = {2011},
  isbn      = {978-0-486-48613-0},
  note      = {No DOI; verified via OpenLibrary edition record OL24906464M. Same 3rd edition also published by Prentice Hall (ISBN 0-13-314899-8)},
}

@book{FranklinPowellWorkman1998,
  author    = {Franklin, Gene F. and Powell, J. David and Workman, Michael L.},
  title     = {Digital Control of Dynamic Systems},
  edition   = {3rd},
  publisher = {Addison-Wesley},
  year      = {1998},
  isbn      = {0-201-82054-4},
  note      = {No DOI; verified via OpenLibrary edition record OL18647263M},
}

@book{ChenFrancis1995,
  author    = {Chen, Tongwen and Francis, Bruce Allen},
  title     = {Optimal Sampled-Data Control Systems},
  publisher = {Springer London},
  year      = {1995},
  isbn      = {9781447130376},
  doi       = {10.1007/978-1-4471-3037-6},
}

@article{Spong1994PFL,
  author  = {Spong, Mark W.},
  title   = {Swing up control of the acrobot using partial feedback linearization},
  journal = {IFAC Proceedings Volumes},
  volume  = {27},
  number  = {14},
  pages   = {833--838},
  year    = {1994},
  doi     = {10.1016/s1474-6670(17)47404-0},
  note    = {Crossref title carries a trailing footnote marker; dropped here},
}

@article{Spong1995Acrobot,
  author  = {Spong, Mark W.},
  title   = {The swing up control problem for the Acrobot},
  journal = {IEEE Control Systems},
  volume  = {15},
  number  = {1},
  pages   = {49--55},
  year    = {1995},
  doi     = {10.1109/37.341864},
  note    = {Crossref record has no author metadata; authorship confirmed via OpenAlex record for the same DOI},
}

@inproceedings{OrioloNakamura1991,
  author    = {Oriolo, G. and Nakamura, Y.},
  title     = {Control of mechanical systems with second-order nonholonomic constraints: underactuated manipulators},
  booktitle = {[1991] Proceedings of the 30th IEEE Conference on Decision and Control},
  pages     = {2398--2403},
  year      = {1991},
  publisher = {IEEE},
  doi       = {10.1109/cdc.1991.261620},
  note      = {Crossref has no issued date for this record; year taken from the proceedings title},
}

@book{Goldstein2002,
  author    = {Goldstein, Herbert and Poole, Charles P. and Safko, John L.},
  title     = {Classical Mechanics},
  edition   = {3rd},
  publisher = {Addison-Wesley},
  year      = {2002},
  isbn      = {978-0-201-65702-9},
  note      = {No DOI; verified via OpenLibrary edition record OL7408371M and review doi 10.1119/1.1484149},
}

@book{Lanczos1949,
  author    = {Lanczos, Cornelius},
  title     = {The Variational Principles of Mechanics},
  publisher = {University of Toronto Press},
  year      = {1949},
  isbn      = {9781487583057},
  doi       = {10.3138/9781487583057},
  note      = {DOI is for the University of Toronto Press digital edition of the first edition},
}

@book{Greenwood1987,
  author    = {Greenwood, Donald T.},
  title     = {Principles of Dynamics},
  edition   = {2nd},
  publisher = {Prentice Hall},
  year      = {1987},
  isbn      = {0-13-709981-9},
  note      = {No DOI; verified via OpenLibrary edition record OL7343756M (record lists 1987; some catalogues give 1988)},
}

@book{Bertsekas2017,
  author    = {Bertsekas, Dimitri P.},
  title     = {Dynamic Programming and Optimal Control, Vol. I},
  edition   = {4th},
  publisher = {Athena Scientific},
  year      = {2017},
  isbn      = {978-1-886529-43-4},
  note      = {No DOI; verified via publisher page http://www.athenasc.com/dpbook.html},
}
```

## Rejected / unverified candidates

- `Åström & Furuta, "Swinging Up a Pendulum by Energy Control", IFAC Proc. Vol. 29(1):1919–1924, 1996, doi 10.1016/s1474-6670(17)57951-3` — verified in Crossref, rejected as a redundant conference precursor of `AstromFuruta2000`.
- `Kalman 1960, "Contributions to the Theory of Optimal Control", in Control Theory, IEEE, 2009, doi 10.1109/9780470544334.ch8` — verified in Crossref, but the record carries **no author metadata** and is a reprint anthology chapter; rejected as a citation target (the original is cited instead, via zbMATH).
- `Higham, "The Scaling and Squaring Method for the Matrix Exponential Revisited", SIAM Review 51(4):747–764, 2009, doi 10.1137/090768539` — verified, rejected as a duplicate of `Higham2005`.
- `Moler & Van Loan, "Nineteen Dubious Ways to Compute the Exponential of a Matrix", SIAM Review 20(4):801–836, 1978, doi 10.1137/1020098` — verified, rejected as superseded by the 2003 update.
- `Molinari, "The Stabilizing Solution of the Algebraic Riccati Equation", SIAM J. Control 11(2):262–271, 1973, doi 10.1137/0311021` — verified, rejected: continuous-time counterpart, redundant for the discrete-time topic.
- `Caines & Mayne, correction, Int. J. Control 14(1):205–207, 1971, doi 10.1080/00207177108932032` — verified, rejected as a standalone entry (recorded in the `CainesMayne1970` note instead).
- `Laub, "A schur method for solving algebraic Riccati equations", 1978 CDC, pp. 60–65, doi 10.1109/cdc.1978.267893` — verified, rejected as a duplicate of the 1979 journal version.
- `Spong, "Swing up control of the Acrobot", ICRA 1994, pp. 2356–2361, doi 10.1109/robot.1994.350934` — verified, rejected as redundant with `Spong1994PFL`/`Spong1995Acrobot`.
- `Susanto et al., "Fuzzy Swing Up Control and Optimal State Feedback Stabilization for Self-Erecting Inverted Pendulum", IEEE Access 8:6496–6504, 2020, doi 10.1109/access.2019.2963399` — returned by the Furuta title query but is a different work; not cited.
- `Kučera, "The discrete Riccati equation of optimal control"` — **not found in Crossref at all** (never rejected as non-existent: verified via EuDML and zbMATH, see `Kucera1972`).
- `Åström & Wittenmark, "Computer-Controlled Systems"` — the zbMATH hit (id 0711.93045) returned only `contents unavailable due to conflicting licenses`, so it was **not** used as evidence; the OpenLibrary edition records were used instead.
- Author verification for `Spong1995Acrobot` via DBLP — attempted, **rejected as a source** because dblp.org returned an anti-bot page, not JSON; OpenAlex was used instead.
- Google Books API and the Library of Congress JSON API — attempted for the textbook records, **rejected as sources** (HTTP 429 rate limiting / SSL resets; HTTP 403 Forbidden respectively). No metadata below was taken from them.

## Notes

- **Two "Nineteen dubious ways" papers and two Higham papers** exist; the 2003/2005 versions above are the ones with matching volume/pages. Do not mix the 1978 volume 20 pages with the 2003 volume 45 pages.
- **Two Molinari papers** share the title "The Stabilizing Solution of the Algebraic Riccati Equation" (1973 continuous, 1975 discrete). The discrete one is `10.1109/tac.1975.1100983`; cite it for topic 7.
- **Kleinman's DOI is `10.1109/TAC.1968.1098829`**, matched on title and pages 114–115. It is easy to mistype (the `1968` block contains several near-identical IEEE TAC DOIs); always take this DOI from the Crossref record rather than from memory, and never hand-edit a DOI's last digits.
- **Do not run `doi2bib` on the no-DOI entries** (`Kalman1960Contributions`, `AndersonMoore1990`, `Pontryagin1962`, `Kucera1972`, `AstromWittenmark2011`, `FranklinPowellWorkman1998`, `Goldstein2002`, `Greenwood1987`, `Bertsekas2017`): they must be entered manually, and books should carry `edition` + `isbn` rather than a fabricated DOI.
- **Books with an electronic DOI are cited by that DOI** (Fantoni & Lozano, Chen & Francis, Lanczos). For Lanczos, `10.3138/9781487583057` points at the University of Toronto Press digital edition of the 1949 first edition, not at the widely used Dover 4th edition (1970), which has no DOI.
- **Åström & Wittenmark**: the `year = 2011` in the BibTeX is the Dover reprint that was verified; the OpenLibrary record for the Prentice Hall printing of the same 3rd edition lists `November 20, 1996` while the book is habitually cited as 1997. Pick one edition and stay consistent — do not write "1997, ISBN 978-0-486-48613-0", which mixes the two.
- **Riccati-equation bibliography cross-checks**: `CainesMayne1970` has a published correction (1971) and `Molinari1975` links to the continuous-time `Molinari1973`. If a reviewer asks for the discrete stabilising-solution conditions, cite `CainesMayne1970`, `Molinari1975` and `Kucera1972` together.
- **Crossref title artefacts to clean before typesetting**: `CainesMayne1970` ends in a footnote dagger `†`, `Spong1994PFL` ends in ` *`, `Molinari1975` is stored in sentence case with lowercase `riccati`, and `KuceraARE1991`/`Spong1996Energy` use Title Case for a chapter/paper title. The BibTeX above already fixes these.
- **Two records have no Crossref year** (`Furuta1991IECON`, `OrioloNakamura1991`); the year 1991 was read off the returned proceedings/event titles, not assumed. OpenAlex reports 2002 for the IECON paper (an IEEE Xplore posting artefact) — do not copy that year.
- **`Spong1995Acrobot` is the only entry whose author list did not come from Crossref** (Crossref returns an empty author array). Marked as such in the entry and the BibTeX `note`; if the report requires every field to be Crossref-sourced, replace it with `Spong1994PFL`.
- **Journal-name variants**: the 1992 Furuta paper is in the IMechE *Part I: Journal of Systems and Control Engineering* (Crossref `container-title`), and the 1995 Spong paper's Crossref container is `IEEE Control Systems` (some styles render it *IEEE Control Systems Magazine*). Use the Crossref strings or normalise both consistently.
- `Furuta1992PseudoState` and `Furuta1991IECON` are the same research group's conference/journal pair; citing both is fine, but the 1992 journal article should carry the primary weight.
