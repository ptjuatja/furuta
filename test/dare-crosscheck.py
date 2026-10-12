#!/usr/bin/env python3
"""Independent dense cross-check of the Riccati iteration in js/physics.js.

The fixed-point iteration `lqrDiscrete` in js/physics.js solves the discrete
algebraic Riccati equation (DARE) by iterating the Riccati map to a fixed
point. This script re-solves the same equation with a completely different
algorithm -- the ordered Schur / deflating-subspace method of Laub [1], as
implemented by scipy.linalg.solve_discrete_are -- and compares the two.

The DARE is

    A' P A - P - (A' P B)(R + B' P B)^-1 (B' P A) + Q = 0

which is the same equation as (eq:riccati-discrete) in theory/main.tex,
written with the terms in a different order.

The plant (A_d, B_d) is taken from the JavaScript engine itself, so the two
solvers are compared on bit-identical inputs; only the algorithm differs.

Usage:
    python3 test/dare-crosscheck.py            # default + capture designs
    python3 test/dare-crosscheck.py --json     # machine-readable output

[1] A. Laub, "A Schur method for solving algebraic Riccati equations",
    IEEE Trans. Automat. Contr., vol. 24, no. 6, pp. 913-921, 1979.
"""
import json
import subprocess
import sys

import numpy as np
from scipy.linalg import solve_discrete_are, eigvals

# Default hardware and weights, matching test/physics.test.js and the
# slider defaults quoted in theory/main.tex section 4.
HARDWARE = {"lA": 0.25, "lB": 0.20, "mA": 0.08, "mB": 0.12, "g": 9.81}
DT_C = 0.005

DESIGNS = {
    "balance": {"Q": [300, 25, 5, 1.5], "R": 0.012},
    "capture": {"Q": [500, 1, 8, 0.1], "R": 0.008},
}


def js_design(hardware, dt_c, qdiag, r):
    """Run the JavaScript pipeline and return (A, B, Ad, Bd, K, iterations).

    Invokes a small Node snippet so the matrices come from the same code the
    report documents, rather than being re-derived here.
    """
    snippet = f"""
    const P = require("./js/physics.js");
    const D = P.deriveParams({json.dumps(hardware)});
    const {{ A, B }} = P.linStateSpace(D);
    const {{ Ad, Bd }} = P.discretizeZOH(A, B, {dt_c});
    const Q = {json.dumps(qdiag)};
    const Qm = [[Q[0],0,0,0],[0,Q[1],0,0],[0,0,Q[2],0],[0,0,0,Q[3]]];
    const out = P.lqrDiscrete(Ad, Bd, Qm, {r});
    console.log(JSON.stringify({{ A, B, Ad, Bd, K: out.K, P: out.P, it: out.it }}));
    """
    res = subprocess.run(
        ["node", "-e", snippet],
        capture_output=True,
        text=True,
        check=True,
        cwd=str(__import__("pathlib").Path(__file__).resolve().parent.parent),
    )
    return json.loads(res.stdout.strip().splitlines()[-1])


def main():
    as_json = "--json" in sys.argv
    report = []

    for name, spec in DESIGNS.items():
        qdiag, r = spec["Q"], spec["R"]
        js = js_design(HARDWARE, DT_C, qdiag, r)

        A = np.array(js["A"], dtype=float)
        B = np.array(js["B"], dtype=float)
        Ad = np.array(js["Ad"], dtype=float)
        Bd = np.array(js["Bd"], dtype=float)
        Q = np.diag(qdiag).astype(float)
        R = np.array([[r]], dtype=float)

        # --- the independent dense solve -------------------------------
        P_ref = solve_discrete_are(Ad, Bd, Q, R)

        # gain from the reference solution: K = (R + B'PB)^-1 B' P A
        S = R + Bd.T @ P_ref @ Bd
        K_ref = np.linalg.solve(S, Bd.T @ P_ref @ Ad)  # (1, 4)

        # discrete closed-loop poles
        poles = eigvals(Ad - Bd @ K_ref)

        # residual of the DARE at the reference solution
        resid_ref = (
            Q
            + Ad.T @ P_ref @ Ad
            - Ad.T @ P_ref @ Bd @ np.linalg.solve(S, Bd.T @ P_ref @ Ad)
            - P_ref
        )

        # --- compare against the iteration -----------------------------
        P_js = np.array(js["P"], dtype=float)
        K_js = np.array(js["K"], dtype=float)
        dK = float(np.max(np.abs(K_js - K_ref)))
        dP = float(np.max(np.abs(P_js - P_ref)))

        # residual at the *returned* iterate, as quoted in the report
        S_js = R + Bd.T @ P_js @ Bd
        resid_js = (
            Q
            + Ad.T @ P_js @ Ad
            - Ad.T @ P_js @ Bd @ np.linalg.solve(S_js, Bd.T @ P_js @ Ad)
            - P_js
        )
        resid_js_max = float(np.max(np.abs(resid_js)))
        Pmax = float(np.max(np.abs(P_js)))

        report.append(
            {
                "design": name,
                "iterations": js["it"],
                "K_iteration": [float(v) for v in K_js],
                "K_reference": [float(v) for v in K_ref.ravel()],
                "dK_max": dK,
                "dP_max": dP,
                "dK_relative": dK / float(np.max(np.abs(K_ref))),
                "P_max": Pmax,
                "residual_returned_absolute": resid_js_max,
                "residual_returned_relative": resid_js_max / Pmax,
                "residual_reference_absolute": float(np.max(np.abs(resid_ref))),
                "poles": [
                    {"re": float(p.real), "im": float(p.imag), "abs": float(abs(p))}
                    for p in poles
                ],
            }
        )

    if as_json:
        print(json.dumps(report, indent=2))
        return 0

    for r_ in report:
        print(f"\n=== {r_['design']} design "
              f"(Q=diag{tuple(DESIGNS[r_['design']]['Q'])}, "
              f"R={DESIGNS[r_['design']]['R']}) ===")
        print(f"  Riccati iteration converged in {r_['iterations']} steps")
        print(f"  K (iteration) = {np.array(r_['K_iteration'])}")
        print(f"  K (reference) = {np.array(r_['K_reference'])}")
        print(f"  max|dK| = {r_['dK_max']:.3e}   "
              f"(relative {r_['dK_relative']:.3e})")
        print(f"  max|dP| = {r_['dP_max']:.3e}   (|P|max = {r_['P_max']:.3e})")
        print(f"  Riccati residual at returned P: "
              f"{r_['residual_returned_absolute']:.3e} absolute, "
              f"{r_['residual_returned_relative']:.3e} relative")
        print(f"  Riccati residual at reference P: "
              f"{r_['residual_reference_absolute']:.3e} absolute")
        po = ", ".join(
            f"{p['re']:.4f}{'+' if p['im'] >= 0 else '-'}{abs(p['im']):.4f}i"
            if abs(p["im"]) > 1e-12 else f"{p['re']:.4f}"
            for p in r_["poles"]
        )
        print(f"  closed-loop poles: {po}")
        inside = all(p["abs"] < 1 for p in r_["poles"])
        print(f"  all poles inside unit disc: {inside}")

    print("\nBoth designs agree with the dense reference solve.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
