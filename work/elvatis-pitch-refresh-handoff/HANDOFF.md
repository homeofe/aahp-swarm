# AAHP Swarm Elvatis Pitch Handoff

Created: 2026-06-27
Source conversation workspace: C:\Users\root\Documents\Codex\2026-06-27\ka

## Main artifacts

- EN source deck: outputs/aahp-swarm-elvatis-html/index.html
- DE source deck: outputs/aahp-swarm-elvatis-html/index-de.html
- EN final PDF: outputs/aahp-swarm-elvatis-html/AAHP_Swarm_Elvatis_HTML_Render_fixed.pdf
- DE final PDF: outputs/aahp-swarm-elvatis-html/AAHP_Swarm_Elvatis_HTML_Render_DE.pdf
- HTML assets (fonts etc.): outputs/aahp-swarm-elvatis-html/assets/
- Build/verify scripts: export-pdf.mjs, render-check.mjs

(QA render folders qa-fixed/, qa-de/, pdf-check/ are git-ignored scratch and regenerate on demand.)

## Current status

- The deck was rebuilt HTML-first after PowerPoint text-box overlap issues.
- Styling follows the Elvatis navy/dark design direction with Fraunces and Inter font assets bundled locally.
- The visible mid-page gridline bug was removed from index.html; there are no remaining gridline markers.
- Footer/page numbering is implemented as a fixed slide-level rail.
- Both final image-based PDFs (EN _fixed.pdf, DE _DE.pdf) verified clean via render-check.mjs and in Edge.

## Notes for the next agent

- Work from outputs/aahp-swarm-elvatis-html/index.html as the source of truth.
- Regenerate the PDF with `node export-pdf.mjs` (requires `npm install puppeteer-core pdf-lib`, already installed here; it drives the installed Chrome). Output: outputs/aahp-swarm-elvatis-html/AAHP_Swarm_Elvatis_HTML_Render_fixed.pdf, plus per-slide QA PNGs in qa-fixed/. Render the output back to PNGs with `node render-check.mjs` to eyeball it.
- ROOT CAUSE of the broken-formatting exports: the slides use CSS radial-gradients (the corner glows + the role-icon badges). A vector PDF print (Chrome `--print-to-pdf` / page.pdf) exports those as type-1 PDF shadings, which many viewers cannot render - they show as solid magenta blobs. That, not the fonts, was the breakage.
- THE FIX (export-pdf.mjs): render each 1280x720 slide to a high-res PNG (after document.fonts.ready so the web fonts are loaded), then assemble the PNGs into a PDF, one slide per page, with pdf-lib. The PDF then contains only images: no shadings, no font edge-cases, renders identically in every viewer. Verified clean via render-check.mjs.
- Trade-off: image-based PDF has non-selectable text and is slightly larger - the right call for a pitch shown on screen/projector. If selectable text is needed later, replace every radial-gradient with solids/axial gradients in print media instead.
- German version: outputs/aahp-swarm-elvatis-html/index-de.html (product/role names kept English: AAHP Swarm, SCOUT/TESTER/RISK/VERDICT, LangGraph/CrewAI/AutoGen; AI -> KI; German number format like "$10,9 Mrd."). Export it with `node export-pdf.mjs index-de.html AAHP_Swarm_Elvatis_HTML_Render_DE.pdf` - the exporter now takes [htmlFile] [outputPdf] args; with no args it builds the English deck. German QA PNGs land in qa-de/.
- German layout gotcha (FIXED): slide 1's Problem/Insight cards use `.wide-info` with a fixed-width label column (was 120px). The English labels "Problem"/"Insight" fit, but the German "Erkenntnis" is 146px wide and overflowed the 120px track, overlapping its body text. Fix (final): in index-de.html only, `.wide-info{grid-template-columns:132px 1fr}` + `.wide-info h2{font-size:24px}` (24px "Erkenntnis" = 130px fits the 132px label track) + `.wide-info p,.wide-info li{font-size:11.5px}` + `.wide-info li{margin-bottom:4px}` so all 4 Problem bullets stay single-line and the content fits the 80px card. NOTE: an interim 150px-column-only fix freed the label but starved the body column, which wrapped the first Problem bullet to a 2nd line that spilled out of the card - the label track and the bullet body share one fixed width, so tune both together. Measure all three: longest label fits the track; longest bullet fits (body width minus the 13px dash indent); N bullet lines fit the card height. Do not eyeball any of it.
- German layout gotcha #2 (FIXED): slide 1's hero `<h1>` is hard-broken with `<br>` ("AAHP Swarm" + 2 lines). The English copy is 3 lines at 40px; the German "...zu verantwortbaren Entscheidungen" segment is too wide for the 559px column at 40px, so it wrapped to a 4th line, making the titleblock 47px too tall and pushing the ".message" box 26.6px down over the ".outcomes" cards. Fix: re-broke the German headline to "Von autonomen Agenten zu" / "verantwortbaren Entscheidungen" and set inline `font-size:34px` on that h1 (the largest size where both lines fit one line each; 35px wraps back to 4). Verified: 3 lines, message box now clears outcomes by ~36px. Same lesson: longest line must fit the column at the chosen font - measure, do not eyeball.
