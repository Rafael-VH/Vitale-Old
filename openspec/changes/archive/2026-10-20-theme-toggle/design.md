# Design: theme-toggle

## 1. Design goal

Add a third dimension — *who decides* — without touching a single colour value. The light palette, the ink
tokens and the eight rule overrides shipped in `light-theme` are correct and verified; this change must reach
them through two paths instead of one, and must leave the dark path byte-identical.

If any step of this design would require re-deciding a colour, the design is wrong. It never does.

## 2. The structural decision: the media block stays, an attribute is added

The naive move is to replace `@media (prefers-color-scheme: light)` with `[data-theme="light"]` and resolve
the OS in JavaScript. It is fewer lines and has one source of truth. It also deletes the only path that works
with JavaScript disabled or before the script runs, and it makes the scheme depend on script execution for
every user, including the majority who never touch the control.

Rejected. Instead both paths coexist:

```css
/* automatic: unchanged values, one guard added */
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) { /* the 15 light tokens, verbatim */ }
}

/* explicit light: same values, second entry point */
:root[data-theme="light"] { /* the same 15 light tokens */ }
```

`auto` is the **absence** of the attribute. There is no `data-theme="auto"`, no third CSS branch, and no way
for the attribute and the media query to disagree — if the attribute is not `dark`, light is allowed; if it
is `light`, light is forced.

The same shape applies to the eight rule overrides, which are selector rules rather than `:root`
declarations:

```css
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) .brand-text h1 { /* light gradient */ }
}
:root[data-theme="light"] .brand-text h1 { /* the same */ }
```

Specificity works out: `:root:not([data-theme="dark"]) .brand-text h1` is (0,3,1) against the base (0,1,1),
and `:root[data-theme="light"] .brand-text h1` is (0,3,1) as well. Both beat the base rule, both sit after it
in the file, and neither touches the dark cascade.

## 3. Why not `light-dark()` or `color-scheme`

`color-scheme: light dark` plus `light-dark()` is the idiomatic modern answer, and it would collapse the
whole thing to one token declaration per value with no duplication. It is rejected for three reasons, in
order of weight:

1. **Blast radius.** It requires rewriting every token declaration and every override into `light-dark()`
   pairs. That is a mechanical rewrite of the exact layer whose dark output was just proven inert with a
   golden diff. The change we are making should not re-open that proof.
2. **Fallback behaviour.** If a browser does not implement `light-dark()`, every colour resolves to an
   invalid value and the app loses its palette entirely. The current design degrades to "light mode does not
   exist", which is survivable. There is no build step here to transpile a fallback.
3. **Scope.** `color-scheme` also restyles native form controls, scrollbars and selection colours. That is
   probably desirable, but it is a separate visual change and it was an explicit non-goal of `light-theme`.

Recorded as a follow-up: if the project ever accepts a browser floor, `light-dark()` is the simplification
worth making. It is not worth making today.

## 4. The duplication, and the guard that keeps it honest

The design duplicates one token block (15 declarations) and one rule block (8 rules). That is the entire cost
of keeping the CSS-only automatic path, and it is mechanical duplication, not divergent logic.

Duplication that can drift is a defect waiting to happen: a future edit to one block and not the other makes
light mode depend on *how* the user reached it. So the duplication gets a test, not a comment:

- parse both light token blocks and compare their declaration sets for equality;
- parse both light rule blocks and compare selector-to-declaration maps for equality.

If someone edits one and forgets the other, the suite goes red with a diff naming the token.

## 5. State model and storage

| Concern | Decision |
|---|---|
| Modes | `auto`, `light`, `dark` — exactly three |
| Default | `auto` |
| Auto representation | attribute absent |
| Storage key | `vitale.theme` in `localStorage` |
| Stored values | the mode string, including `auto` |
| Invalid or unreadable storage | treated as `auto`, never an error |
| Cycle order | `auto` → `light` → `dark` → `auto` |

`auto` is stored explicitly rather than by removing the key. Both work; storing it makes the stored state
readable and makes "the user chose auto" distinguishable from "the user never chose".

Cycle order puts `auto` first because it is the default and the escape hatch: two clicks from anywhere return
the app to following the OS.

`localStorage` is wrapped in `try/catch` on both read and write. Private-browsing modes and some `file://`
contexts throw on access; a thrown error must not break the app, only the persistence.

## 6. The anti-flash pre-paint script

A stored `light` mode on a dark OS would otherwise render dark for one frame before `js/theme.js` runs at the
bottom of the document. That flash on every reload is the most visible defect this feature can ship with.

So a small inline script goes in `<head>`, **before** the stylesheet link:

```html
<script>
(function(){try{var m=localStorage.getItem('vitale.theme');
if(m==='light'||m==='dark')document.documentElement.setAttribute('data-theme',m);}catch(e){}})();
</script>
```

It runs before the first paint of any styled content, and it is deliberately tiny. It duplicates the key name
and the two valid explicit values — three tokens of knowledge — which is less risky than making the whole
initial paint depend on an external file. `js/theme.js` remains the single owner of the behaviour; this
script only restores the attribute.

It is not a module and not deferred on purpose: `defer` runs after parsing, which is after a paint is
possible.

## 7. The control

Placement: last child of `.status-bar`, after `#siteBadge`. `#platformBadge` already carries `.pill-push`
(`margin-left:auto`), so appending the control puts it at the far right of the bar without a new layout rule.
It joins the cluster that already reads as application chrome, and it costs no space from the main panel.

Shape: a `<button type="button">` styled as a compact icon button, sharing the pill's geometry and tokens so
it inherits both schemes for free. Not a `<span>` with a click handler, and not an input: it is a button and
must behave like one.

Icon: inline SVG, `stroke="currentColor"`, `aria-hidden="true"`, three glyphs swapped by mode:

| Mode | Glyph | Reads as |
|---|---|---|
| `auto` | circle half-filled | "let the system decide" |
| `light` | sun | light |
| `dark` | moon | dark |

The icon shows the **stored mode**, not the resolved scheme. In `auto` on a light OS the button shows the
automatic glyph, not a sun: the control reports what the user chose, and the page reports what is rendered.
Showing the resolved scheme would make the button ambiguous — a user in `auto` would see "sun" and reasonably
conclude they had pinned light.

Accessibility: `aria-label` states the current mode and what the next activation does, e.g.
`Tema: Automático. Cambiar a Claro.` A `title` mirror is not required but is harmless. The control must be
focusable and operable with Enter and Space, which a native button gives for free. The mode is conveyed by
glyph shape and label, never by colour alone.

No animation is added. The stylesheet already honours `prefers-reduced-motion` globally, and a colour
transition on the whole page is a per-frame repaint nobody asked for.

## 8. What stays untouched

- Every colour value in both palettes.
- The two ink tokens and the role split they encode.
- The eight rule overrides, in value and in position.
- The dark `:root` declarations.
- The archived golden files: `dark-golden.json` is reused as the inertness baseline.

## 9. Verification plan

- **Suite**: `tests/theme.test.js` extended with the attribute-block, drift, guard, module and markup
  assertions. RED observed before the CSS change, GREEN at the end of the JS phase.
- **Browser, six combinations**: `{auto, light, dark} × {OS light, OS dark}`. Each combination asserts the
  body background, body text, brand title gradient, status dot, card background, and both ink tokens against
  the expected palette.
- **Golden**: `dark-golden.json` re-captured under explicit dark and under auto+dark OS; must diff clean,
  except the two dead tokens already documented as removed.
- **Persistence**: set `light`, reload, assert the first sampled frame is already light; repeat for `dark`.
- **Fallback**: seed an invalid value and assert `auto` plus a rendered app.
- **Contrast**: the light ratios were measured in `light-theme` and do not change; the new control's icon and
  focus ring are measured explicitly.

## 10. What the human is approving

- Three modes, `auto` by default, with the cycle order `auto` → `light` → `dark`.
- Persistence in `localStorage`, which means the app now stores one piece of state.
- A small inline script in `<head>` whose only job is preventing a flash.
- Roughly 46 duplicated CSS lines, guarded by a test, in exchange for not rewriting the token layer.
- The spec rewrite: "follows the operating system" becomes "selectable, with auto as the default".
