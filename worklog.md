# Project Worklog — StudyPad (Study Notepad App)

Project: Study notepad app for studies — subjects → chapters → notes hierarchy,
localStorage persistence, LaTeX math + chemical equations (KaTeX + mhchem).

## Stack
- Next.js 16 App Router, TypeScript, Tailwind v4, shadcn/ui
- zustand + persist (localStorage) — no backend needed (user wants localStorage)
- react-markdown + remark-gfm + remark-math + rehype-katex + katex/contrib/mhchem

---
Task ID: 1
Agent: main (Z.ai Code)
Task: Install packages (katex, remark-math, rehype-katex, remark-gfm, @types/katex)

Work Log:
- Verified existing deps: react-markdown, zustand, sonner, lucide-react already present
- Installed katex@0.19.0, remark-math@6, rehype-katex@7, remark-gfm@4, @types/katex
- Verified `katex/contrib/mhchem` subpath export + types exist (for \ce{} chemistry syntax)

Stage Summary:
- All rendering deps ready; mhchem registers \ce{} macro into KaTeX globally
- App is frontend-only (localStorage persistence) — no API routes/Prisma needed

---
Task ID: 2
Agent: main (Z.ai Code)
Task: Build complete StudyPad app — store, UI components, page assembly

Work Log:
- Created src/lib/notepad/: types.ts, constants.ts (subject palette, excerpt util), seed.ts (8 sample notes with chemistry/physics/math/biology content), store.ts (zustand + persist → localStorage key studypad-data-v1, full CRUD + selection normalization)
- Created src/components/notepad/: markdown-preview.tsx (react-markdown + remark-gfm/math + rehype-katex + mhchem side-effect import + Latex component), snippets.ts (14 slash items + 15 formula templates), sidebar.tsx (subjects/chapters tree, collapse, dropdown CRUD), notes-pane.tsx (list, global search, pin, delete confirm), editor-pane.tsx (title, toolbar, formula dropdown, edit/split/preview modes, Notion-style "/" slash menu with keyboard nav, stats bar, copy/export .md), cheat-sheet.tsx (3-tab syntax guide with live-rendered examples), name-dialog.tsx (create/rename with colour picker), theme-toggle.tsx (CSS-only dark mode)
- page.tsx: h-dvh layout — header (logo, cheat sheet, theme, data menu w/ export/import/clear), 3 panes with mobile view-switching (tree/notes/editor), sticky footer with stats + safe-area padding
- layout.tsx: ThemeProvider (next-themes class), metadata; globals.css: .markdown-body styles, katex-display overflow, custom scrollbars
- next.config.ts: devIndicators: false (removed dev N badge overlapping UI)

Stage Summary:
- Full app built; localStorage persistence via zustand persist; KaTeX + mhchem for \ce{} chemistry

---
Task ID: 3
Agent: main (Z.ai Code)
Task: Fix build/runtime issues + lint compliance

Work Log:
- Fixed: default→named Input import (editor-pane); Markdown→FileText lucide icon (cheat-sheet)
- Fixed dual-katex-instance bug: rehype-katex had nested katex@0.16.47 while root was katex@0.19.0 — mhchem registered on the wrong instance → \ce{} rendered as error. Aligned root katex to 0.16.47, removed stale nested copy → single shared instance
- Added normalizeMathBlocks(): single-line "$$…$$" rewritten to multi-line so it renders as centered display math (Notion behaviour)
- Lint (react-hooks/set-state-in-effect): NameDialog restructured to conditional-mount (no sync effect); ThemeToggle switched to CSS-only dark: variants; editor mobile mode derived (effectiveMode) instead of effect; page.tsx mounted flag via useSyncExternalStore
- Dev server daemonization: sandbox reaps children of tool commands — fixed with ( setsid … & ) orphan-reparenting pattern

Stage Summary:
- Lint 0 errors; mhchem verified working (0 katex-error, arrows + subscripts render)

---
Task ID: 4
Agent: main (Z.ai Code)
Task: End-to-end browser verification (agent-browser + VLM)

Work Log:
- Verified page loads (HTTP 200), 3-pane layout, seed data (4 subjects, 7 chapters, 8 notes)
- KaTeX/mhchem: 4 display equations + 2 inline render, 0 errors; formula dropdown previews render live LaTeX
- Slash menu: "/" opens 14 items, "/chem" filters to 2, Enter inserts block, renders live (4→5 display)
- Toolbar math block insert verified; chapter navigation; new note creation; global search ("equilibrium" cross-chapter with badges + navigation); cheat sheet (10 chem + 11 math examples); subject create (History, teal) + delete w/ confirmation; dark mode toggle; localStorage persistence across reload (studypad-data-v1)
- Mobile 390px: single-pane views, back navigation tree→notes→editor, footer + safe-area OK; VLM QA of desktop/mobile/dark screenshots: PASS, no defects; console: no errors/warnings (dialog aria-describedby fixed)
- Cleaned up test artifacts

Stage Summary:
- All golden-path flows browser-verified; app interactive and runnable; lint clean; dev server healthy on :3000

---
Task ID: 5
Agent: main (Z.ai Code)
Task: Replace edit/split/preview modes with a true Notion-style WYSIWYG editor — click any block to edit it in place (no raw markdown/LaTeX "behind the scenes"), "/" command menu to insert anything

Work Log:
- New src/lib/notepad/blocks.ts — block model: 12 block types (p/h1-h3/bullet/numbered/todo/quote/code/divider/math/table), markdown ⇄ blocks parser + serializer (handles $$…$$ single+multi-line, fences, tables, lists, todos), autoResize helper
- snippets.ts rewritten: BLOCK_COMMANDS (14 slash commands as block transforms / inline inserts) + FORMULA_TEMPLATES (kept) exposed as TEMPLATE_COMMANDS with live LaTeX previews; unwrapTemplate helper
- New slash-menu.tsx: reusable command palette (icons per command, live-rendered equation previews in items, flip-up near viewport bottom, scroll-into-view keyboard highlight)
- New block-editor.tsx (~1250 lines): the WYSIWYG core —
  • every block renders rich by default; clicking swaps THAT block into an in-place editor (auto-growing textarea with matching typography)
  • math blocks render centered KaTeX/mhchem; click → LaTeX editor with LIVE preview + \ce{} hint + Done button (Enter/Esc commit)
  • code/table blocks: source editor + live rendered preview; todo blocks: clickable checkboxes; quote/bullet/numbered styled like Notion
  • "/" opens command menu (typed queries filter; ↑↓/Enter/Esc; strip typed "/query" on insert; empty-paragraph transforms in place, else inserts below; \ce{} pre-filled with caret inside braces)
  • keyboard: Enter splits block at caret (lists continue), Shift+Enter newline, Backspace merges/converts/exits lists, arrows jump between blocks, Ctrl+B/I/E wrap selection, Ctrl+Enter toggles todo
  • hover gutter: "+" (insert + open menu) and ⠿ drag handle (HTML5 drag reorder with drop indicator) + dropdown (move up/down/duplicate/delete)
  • click-to-append zone at bottom; click-away deactivation; blur-retention when focus moves to toolbar/menus so toolbar acts on the right block
  • persistence: blocks → markdown debounced 600ms into existing zustand store (note.content stays markdown → old notes/backups/seed keep working), flush on unmount/beforeunload; re-parse guard for external content changes (import)
- editor-pane.tsx rewritten: removed edit/split/preview mode switch + monospace textarea; new toolbar (H1-3, B/I/code, lists/todo/quote/table/code/divider, inline x, Σ equation, ⚗ chemical w/ caret inside \ce{}, Formulas dropdown) driving the editor via useImperativeHandle ref
- cheat-sheet: third tab → "Editor" (click-to-edit, /, drag handle, Enter/Backspace behaviours); types.ts: EditorMode removed; globals.css: .block-inline/.block-math styles
- Bugs fixed during browser verification: Enter-split didn't move focus (missing setActiveId on new block); toolbar transforms landed on wrong block (blur deactivated it — fixed via relatedTarget check + document pointerdown click-away)
- Browser-verified (agent-browser + VLM): rendered-only view (0 raw code), click-to-edit, / + /chem + /to filtering, keyboard nav, chem equation insert w/ live preview + commit, template insert (quadratic w/ fraction), H1/H2 toolbar transforms, todo create/continue/toggle + strikethrough, duplicate, Backspace merge, click-away, persistence across reload, mobile 390px (editor + footer + safe-area), dark mode, clean console, lint 0 errors

Stage Summary:
- App is now a genuine WYSIWYG Notion-like editor: notes always look rendered; you edit in place; "/" inserts anything (incl. rendered equations/chemistry with live preview)
- localStorage format unchanged (markdown) — no migration needed; all previous flows (search, export, import, seeds) intact

---
Task ID: 6
Agent: main (Z.ai Code)
Task: Print feature with customisable settings — print output identical to the preview (the reason the user ditched Notion)

Work Log:
- New src/lib/notepad/print.ts — PrintSettings model (paper a4/letter/a5/legal, orientation, marginMm 0–40, textSizePt 9–16, colour color/bw, backgrounds, titleBlock, pageNumbers), paper geometry (mm⇄px @96dpi), buildPrintCss() generating @page size/margin + @page @bottom-center "Page X of Y" margin boxes, zustand persist store (localStorage key studypad-print-v1)
- markdown-preview.tsx: added optional prepend + style props (print title block + pt base font size) — backwards compatible
- New print-body.tsx — PrintBody = single render pipeline shared by the real print (#print-root), the hidden pagination measurement container and the visible preview sheets; PrintTitleBlock (subject-colour dot · breadcrumb, title, date); bw/print-no-bg flags via wrapper classes
- New print-root.tsx — #print-root (direct <body> child, display:none on screen; @media print hides body > *:not(#print-root) and shows only the print output) + <style> with the dynamic @page rules
- New print-dialog.tsx (~430 lines) — settings column (paper select, orientation toggle, margins slider, text-size slider, colour toggle, 3 switches, reset) + live paginated preview: hidden offscreen measurement at true page width → greedy pagination mirroring the print CSS break rules (break-inside avoid; headings keep-with-next) → paper sheets with zoom (Fit/75%/100%; fit computed from live DOM); footer chips "Page X of Y"; Print button → window.print()
- editor-pane.tsx: Print button (with Printer icon) in the note top bar; page.tsx: PrintRoot/PrintDialog mounts, Ctrl/Cmd+P intercept opens the dialog; footer hint updated
- globals.css: print section — @media print rules (hide everything except #print-root, break-inside/break-after mirrors, print-color-adjust exact), .print-content em-based typography (scales with pt setting, immune to dark mode), title-block styles, .print-measure offscreen, .print-sheet paper look
- Bugs found & fixed during browser verification:
  • Dev-server served stale CSS chunk after globals.css edit (Turbopack CSS module cache) — fixed by full dev-server restart (kill + setsid respawn)
  • Pagination loop lost blocks: `continue` in a for-loop still runs i++ → every flushed block was dropped (e.g. the CH₄ combustion equation vanished). Rewrote without continue — flush() then place; verified all 16 measured blocks render (16=16)
  • "Fit" zoom feedback loop: sheet width inflated the scroll container's min-content → flex column (min-width:auto) grew → next fit measurement read the grown container (self-sustaining at wrong size). Fixed with min-w-0 on the preview flex column; fit now computed from live DOM at build time (RO + window resize only act as re-run triggers)
- Browser-verified (agent-browser + PDF + VLM): dialog opens from button and Ctrl+P; all settings live-update preview AND @page CSS (A5 → 559px sheets + size:148mm 210mm; landscape; margins 20mm → 75.59px padding; 13pt; bw → grayscale filter; backgrounds/title/page-numbers switches; reset); pagination parity (7+8 blocks, 16/16 placed, headings not stranded); KaTeX/mhchem renders in preview (4 display + inline) and in the actual PDF output; window.print() safe no-op in headless; REAL PDF generated via print pipeline — pure print output (title block, rendered equations, "Page 1 of 1" footer, ZERO app chrome) — page size comes from the user's browser print dialog honouring @page (test tool used its Letter default, a tool limitation, not an app defect); dark mode prints light-on-white; empty note → 1 page (title only); test note created+deleted (data back to 8 notes); settings persist (studypad-print-v1) across reload; mobile 390px (314px fit sheets, no horizontal scroll); 100% zoom contained; console 0 errors; lint 0 errors; VLM QA of dialog screenshot: PASS×3

Stage Summary:
- Print pipeline = the preview: one PrintBody render feeds the real print, the measurement and the preview — "same as preview" by construction
- 8 customisable settings persisted in localStorage; page numbers via @page margin boxes (graceful degrade in older browsers); @page size/margin drives real browser printing + "Save as PDF"
