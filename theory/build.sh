#!/usr/bin/env bash
# Rebuild theory/main.pdf from theory/main.tex.
#
# The site serves the committed PDF (control.html embeds it), and there is no CI,
# so nothing on the website changes until this script is run AND the regenerated
# theory/main.pdf is committed. Three passes so the table of contents and the
# bibliography's \ref/\cite numbers settle.
set -euo pipefail

cd "$(dirname "$0")"

pdflatex -interaction=nonstopmode main.tex > /dev/null
bibtex main > /dev/null
pdflatex -interaction=nonstopmode main.tex > /dev/null
pdflatex -interaction=nonstopmode main.tex > /dev/null

# keep the workspace tidy: the PDF is the artifact worth committing
rm -f main.aux main.blg main.log main.toc

echo "built $(pwd)/main.pdf"
pdfinfo main.pdf 2>/dev/null | grep -E '^Pages' || true
