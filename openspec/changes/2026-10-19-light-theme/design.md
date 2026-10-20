# Light Theme — Design

> Written before any code change. Every contrast figure below was computed with the WCAG 2.1 relative-luminance formula against the real composited surface (alpha tints composited over their base, worst-case base used), not eyeballed. These values are decisions, not facts: veto any of them and the design is re-derived before a single line of CSS is touched.

Source of scope: `proposal.md`, Approach 2-acotado. This document contains no file edits and no test code — only the decisions those edits will implement.

## 1. Design goal

One light scheme, driven only by `prefers-color-scheme: light`, produced by re-declaring token values inside a media block. Zero JavaScript, zero persistence, zero toggle. The dark scheme must be byte-identical in behaviour.

## 2. The one structural decision: split the two roles of an accent

`--accent` (`#5eead4`) and `--success` (`#34d399`) currently serve **two incompatible jobs**:

- **Fill role** — background of `.btn-primary`, `.btn-success`, gradients. Always paired with dark ink on top.
- **Foreground role** — text, borders, icons read directly on a surface.

In dark these coincide, because a saturated pale colour reads fine as text on a dark surface. In light they **diverge irreconcilably**: the fill must stay vivid (dark ink on it still reads at 7.7:1 — see §5), so it cannot be darkened; as foreground text on white it collapses to 1.8:1. One token cannot hold both values.

**Decision:** add `--accent-ink` and `--success-ink`, used at the 12 foreground sites only; leave the vivid tokens untouched. In dark, `*-ink` resolves to the same value as the vivid token, so the dark scheme is bit-for-bit unchanged — this inertness is a *requirement* of the spec and is directly testable in the browser (`getComputedStyle` must return equal values for both tokens in dark).

## 3. Token layer

`:root` keeps 18 colour tokens + 2 radii. In light, 15 of those are re-declared and 2 are added; 3 are deliberately left alone.

### 3.1 Unchanged in light (do not re-declare)

| Token | Value | Why it cannot be darkened |
|---|---|---|
| `--accent` | `#5eead4` | 6 fill sites pair it with dark ink that still reads at 7.7–13.0:1. Darkening it would break `.btn-primary` and the brand mark. |
| `--accent-2` | `#818cf8` | Only used as a gradient stop beside `--accent`, with the same dark ink. |
| `--success` | `#34d399` | `.btn-success` ink is 7.7:1 on it. |
| `--radius`, `--radius-sm` | — | Not colour. |

### 3.2 Re-declared in light

| Token | Dark (unchanged) | Light (proposed) | Measured contrast in light |
|---|---|---|---|
| `--bg` | `#0a0e1a` | `#f8fafc` | — |
| `--bg-soft` | `#0f1524` | `#f1f5f9` | — |
| `--surface` | `#131a2c` | `#ffffff` | — |
| `--surface-2` | `#1a2337` | `#f1f5f9` | — |
| `--border` | `#243049` | `#d8e0ec` | decorative, see §7 |
| `--border-soft` | `#1c263c` | `#e6ebf3` | decorative, see §7 |
| `--text` | `#eef2f9` | `#0f172a` | 17.85:1 on surface · 17.06:1 on bg · 16.30:1 on surface-2 |
| `--text-dim` | `#8b98b4` | `#475569` | 7.58:1 on surface · 6.92:1 on surface-2 |
| `--text-mute` | `#5c6884` | `#556277` | **5.64:1 on surface-2 (tightest)** · 6.18:1 on surface · 5.90:1 on bg |
| `--accent-glow` | `rgba(94,234,212,.18)` | `rgba(17,94,89,.16)` | focus ring / pill wash, see §6 |
| `--accent-ink` | `#5eead4` (= vivid) | `#115e59` | 7.58:1 on surface · 5.59:1 on glow over surface-2 · 5.82:1 on glow over bg |
| `--success-ink` | `#34d399` (= vivid) | `#047857` | 5.48:1 on surface · 5.17:1 on success tint |
| `--error` | `#f87171` | `#dc2626` | 4.83:1 on surface (status dot) |
| `--warn` | `#fbbf24` | `#92400e` | 6.14:1 on warn pill over surface-2 · 7.09:1 on surface |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,.3)` | `0 1px 2px rgba(15,23,42,.06)` | — |
| `--shadow-lg` | `0 20px 60px rgba(0,0,0,.5)` | `0 20px 60px rgba(15,23,42,.14)` | — |

`--text-mute` was chosen for the **worst** surface it lands on (`--surface-2`, pills and badges), not the most favourable one. `#64748b` — the obvious "next step lighter" — measures 4.35:1 there and **fails AA**; it is rejected, not "close enough".

### 3.3 Deleted (dead in both schemes)

| Token | Evidence |
|---|---|
| `--accent-2-glow` (`:root:41`) | 0 usages repo-wide. |
| `--shadow` (`:root:51`) | 0 usages repo-wide; `--shadow-sm` and `--shadow-lg` are the live ones. |

Removing them is what lets the token-coherence requirement ("every declared token is used") pass.

### 3.4 Added

`--accent-ink`, `--success-ink` only. No other new vocabulary.

## 4. Alert inks

The four alert foregrounds are **re-declared as rule overrides, not tokens**, because each is a status-specific ink with no other consumer. Values chosen so the override always equals the matching token where a token exists:

| Rule | Light value | Equals | Contrast on its tint |
|---|---|---|---|
| `.alert-warn` | `#92400e` | `--warn` | 6.80:1 |
| `.alert-err` | `#b91c1c` | — (heavier than `--error`; red alert prose is the densest text on the page) | 6.00:1 |
| `.alert-ok` | `#047857` | `--success-ink` | 5.17:1 |
| `.alert-info` | `#115e59` | `--accent-ink` | 7.31:1 |

## 5. Fill+ink pairs that stay shared by both schemes

These six pairs are untouched by the change and prove why the vivid tokens must not be darkened in light:

| Pair | Ratio |
|---|---|
| `.btn-primary` ink `#062018` on `#5eead4` | 11.56:1 |
| `.btn-primary` ink `#062018` on `#3fd6bf` (gradient far stop) | 9.44:1 |
| `.btn-success` ink `#052e20` on `#34d399` | 7.70:1 |
| `.btn-success` ink `#052e20` on `#10b981` (far stop) | 5.84:1 |
| `.brand-mark` ink `#0a0e1a` on `#5eead4` | 13.02:1 |
| `.step-num` ink `#0a0e1a` on `#818cf8` | 6.46:1 |

## 6. The eight rule overrides

Everything below is re-declared **inside the media block** with its own literal. None of these can be a token without inventing a vocabulary that has exactly one consumer.

| Selector | Dark (kept as-is) | Light | Why not a token |
|---|---|---|---|
| `.brand-text h1` | `linear-gradient(135deg,#fff,#cbd5e1)` | `linear-gradient(135deg,#0f172a,#5b6a80)` | Unique 2-stop brand gradient. Worst stop measures 5.26:1 on `--bg`. |
| `.btn:hover:not(:disabled)` | `background:#22304a;border-color:#2f3f5c` | `background:#e8eef7;border-color:#aebdd2` | Hover surfaces are one-off; the light pair deepens in the same direction as dark. Text on hover bg: 15.31:1. |
| `.alert-warn` / `.alert-err` / `.alert-ok` / `.alert-info` | dark inks | see §4 | Per-status one-offs. |
| `.pill-site` | `color:#c4b5fd` | `color:#6d28d9` | Unique violet tint with a single consumer. 5.87:1 over its own wash on `--surface-2`. |
| `.status-dot.ready` | `background:var(--success)` | `background:var(--success-ink)` | **The eighth override.** The proposal counted seven; measurement showed `#34d399` on a light surface is 1.8:1, i.e. the "motor listo" indicator would be invisible. It rides the same role split as the rest of `--success`, so it is covered by the existing legibility requirement, not a scope change. 5.48:1. |

The other two status dots (`idle` → `--error`, `loading` → `--warn`) already ride tokens and need nothing.

## 7. Deliberate non-conformance: hairline borders

WCAG 1.4.11 asks 3:1 for UI boundaries. Neither scheme meets it for hairlines, and that is the existing design language, not something this change introduces:

| Pair | Ratio |
|---|---|
| Dark `--border` on `--bg` | 1.46:1 |
| Dark `--border` on `--surface-2` | 1.19:1 |
| Dark `--surface-2` (button fill) on `--bg` | 1.23:1 |
| Light `--border` on `--surface` | 1.33:1 |
| Light hover border on `--bg` | 1.82:1 |
| Light `--surface-2` (button fill) on `--bg` | 1.05:1 |

**Decision:** do not chase 3:1 on hairlines. Controls are identified by their label, their fill, and their hover/focus state; the borders are decorative reinforcement. Raising light hairlines alone would make the light scheme look heavier and "more bordered" than the dark one — a regression in the thing the spec actually protects ("the dark theme is unchanged" is about behaviour, but visual parity between schemes is the point of the feature). The 3:1 floor is enforced where it carries meaning, and all of those pass:

| Meaningful indicator | Ratio |
|---|---|
| Focus border (`--accent-ink`) on `--bg` | 7.25:1 |
| `.status-dot.ready` | 5.48:1 |
| `.status-dot` idle | 4.83:1 |
| `.status-dot.loading` | 7.09:1 |

## 8. What stays as literal inside the media block (ponytail scope cut)

Not tokenised, deliberately:

- Pill/badge/alert **backgrounds** (`rgba(52,211,153,.08)`, `rgba(251,191,36,.12)`, `rgba(167,139,250,.12)`, …). They are decorative washes whose *character* is scheme-invariant (a pale tint over a pale surface); their foregrounds are what carry meaning, and those are already switched.
- The focus ring's own alpha (`rgba(...,.16)` in `box-shadow`) — the border colour is the real indicator (7.25:1) and already rides `--accent-ink`.
- The `.loaded` / upload-card washes — same argument.
- Borders and hairlines — §7.

Each of these gets a `ponytail:` comment naming the ceiling: *if these washes ever need re-tinting per scheme, promote them to tokens then — until then a second vocabulary has one consumer each and buys nothing.*

## 9. Verification plan (implemented in Apply, not here)

1. **Dark golden first.** Before editing `styles.css`, capture computed styles for ~20 representative elements in the dark scheme into a fixture. After the edit, the same capture must be byte-identical. This is the real proof that the dark scheme is unchanged — not a code read.
2. **Static suite (RED first).** `tests/theme.test.js` asserts, over `styles.css` as text: the media block exists; every `:root` colour token has a light re-declaration (except the three intentionally shared); every `var()` used is declared; the two dead tokens are gone. Assertions 1–3 are the RED (all three fail today); the "every `var()` is declared" assertion passes today and is labelled a permanent guard, not RED.
3. **Browser probe.** Relaunch the page with the light scheme forced and re-measure the tightest pairs *in the browser* (`getComputedStyle` + the same luminance maths), rather than trusting this document. Forcing `prefers-color-scheme` from the available tooling is unconfirmed; if it cannot be forced, that limitation is reported in the verify report rather than papered over with a green check.
4. **Full existing suite** must stay at 7 suites / 71 assertions / 0 failures.
5. **Docs sync.** The five false statements listed in `proposal.md` are corrected in the same commit.

## 10. What the human is approving

Veto anything here before Apply:

1. `--text-mute: #556277` (5.64:1 on the tightest surface).
2. `--accent-ink: #115e59` and `--success-ink: #047857`.
3. `--warn: #92400e`, `--error: #dc2626`.
4. The two shadow colours in light (kept very soft on purpose — they are the only thing giving panels depth on a white page).
5. §7: hairline borders stay sub-3:1 in light, matching dark.

If none of these is vetoed, Apply proceeds exactly as written here.
