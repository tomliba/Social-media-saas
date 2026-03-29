# Design System Specification: The Fluid Curator

## 1. Overview & Creative North Star
The "Creative North Star" for this design system is **The Digital Gallery**. Unlike standard SaaS platforms that feel like rigid spreadsheets, this system treats the interface as a premium, breathable canvas. It is inspired by the tactile nature of high-end editorial magazines and the fluid responsiveness of modern creative tools.

To move beyond the "template" look, we employ **Intentional Asymmetry**. We break the traditional 12-column grid by using generous, varying white space (using our `16` and `24` spacing tokens) and overlapping media elements over container edges. This creates a sense of "work in progress" energy that feels approachable yet high-end.

---

## 2. Colors & Surface Architecture
Our palette centers on a sophisticated Soft Purple, supported by warm, organic neutrals that prevent the UI from feeling clinical.

### The "No-Line" Rule
**Strict Mandate:** Designers are prohibited from using 1px solid borders for sectioning or grouping. 
Boundaries must be defined through:
1.  **Background Color Shifts:** Use `surface-container-low` for a sidebar sitting on a `surface` background.
2.  **Tonal Transitions:** Use depth and padding to define edges rather than lines.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the following hierarchy to "nest" importance:
*   **Base Layer:** `surface` (#f7f6f4) — The main stage.
*   **Secondary Sectioning:** `surface-container-low` (#f1f1ef) — For subtle grouping.
*   **Active Interaction Areas:** `surface-container-highest` (#dddddb) — For high-contrast utility areas.
*   **Elevated Components:** `surface-container-lowest` (#ffffff) — Reserved for cards and modals to create a "lifted" feel against the warm background.

### The "Glass & Gradient" Rule
To achieve a signature "Pro" look:
*   **Glassmorphism:** For floating navigation or toolbars, use `surface` at 80% opacity with a `20px` backdrop-blur.
*   **Signature Textures:** For primary CTAs, do not use flat hex codes. Apply a subtle linear gradient from `primary` (#6f33d5) to `primary-container` (#b28cff) at a 135° angle.

---

## 3. Typography: Editorial Utility
We pair **Plus Jakarta Sans** (Display/Headlines) with **Be Vietnam Pro** (Body/Titles) to balance personality with high-utility legibility.

*   **Display (lg/md/sm):** High-impact, tight tracking (-2%). Used for hero statements and major milestones.
*   **Headline (lg/md/sm):** The "Curator's Voice." Bold, authoritative, yet friendly.
*   **Title (lg/md/sm):** Used for card headings. Swapping to *Be Vietnam Pro* here provides a subtle "utility" shift, signaling to the user that they are in an actionable zone.
*   **Body (lg/md/sm):** Generous line-height (1.6) is mandatory. Never use pure black; use `on-surface-variant` (#5b5c5a) for long-form text to reduce eye strain.

---

## 4. Elevation & Depth
Depth is a functional tool, not a decoration. We use "Tonal Layering" to convey hierarchy.

*   **The Layering Principle:** Place a `surface-container-lowest` (Pure White) card on a `surface` (Warm Neutral) background. The 16px (`DEFAULT`) corner radius softens the transition, making the card feel like a floating sheet of paper.
*   **Ambient Shadows:** For floating elements (Modals/Popovers), use a custom shadow: `0px 20px 40px rgba(111, 51, 213, 0.06)`. Note the subtle purple tint in the shadow—this mimics natural light refracting through our primary accent color.
*   **The Ghost Border:** If accessibility requires a stroke, use `outline-variant` (#adadab) at **15% opacity**. Anything higher is too heavy for this system.

---

## 5. Components

### Cards & Lists
*   **Visual-First:** Cards must prioritize a "Visual Area" using at least 60% of the card's real estate.
*   **No Dividers:** Forbid the use of divider lines in lists. Use `spacing-4` (1.4rem) between items or a `surface-container-low` hover state to indicate separation.

### Buttons
*   **Primary:** Gradient-filled (Primary to Primary-Container) with `rounded-full` (9999px) or `rounded-md` (1.5rem). 
*   **Secondary:** `surface-container-highest` background with `on-surface` text. No border.
*   **Tertiary:** Transparent background, `primary` text. Use for low-priority actions.

### Input Fields
*   **Styling:** Use `surface-container-lowest` with a `rounded-sm` (0.5rem) corner. 
*   **Focus State:** A 2px "Ghost Border" of `primary` at 40% opacity. Avoid heavy glow effects.

### Creative Tools (Additional Components)
*   **The "Stage" Container:** A large, `rounded-lg` (2rem) area using `surface-dim` to isolate creative work from the UI.
*   **Floating Action Bar:** A `rounded-full` glassmorphic pill that sits at the bottom-center of the viewport, housing the most frequent creative shortcuts.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical margins. If the left margin is `spacing-8`, try a right margin of `spacing-12` for editorial layouts.
*   **Do** lean into the "Warm Neutral" background. It makes the `Soft Purple` accents pop with a premium "SaaS-plus" feel.
*   **Do** use `rounded-xl` (3rem) for large image containers to emphasize the "friendly" vibe.

### Don't
*   **Don't** use 1px dividers. If you feel you need one, increase your white space by `spacing-2` instead.
*   **Don't** use pure black (#000000) for text. It breaks the "premium" softness of the warm background.
*   **Don't** cram content. If a screen feels busy, remove one element or move it to a "Surface Layer" (drawer/modal).