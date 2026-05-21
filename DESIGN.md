# Crickfin Design System

## 1. Visual Theme & Atmosphere

Crickfin is a dark-mode-native cricket league management platform that channels the aesthetic of a premium dashboard — deep void-black backgrounds (`#0b0d12`, `#11141d`) with emerald green accents (`#10b981`, `#059669`) that reference the grass-emerald green identity of cricket grounds. The design system feels polished, modern, and highly interactive.

The typography is built on:
- **Outfit**: A premium geometric sans-serif for display titles and header cards, creating dense, modern, and impactful statements.
- **Inter**: A highly legible sans-serif for body copy, table listings, labels, and forms.
- **Monospace Companion** (`SFMono-Regular`, `Consolas`, `monospace`): Appears for uppercase technical labels, dates, codes, transaction hashes, and balances.

Crickfin utilizes a sophisticated HSL-based color token system with alpha channels, allowing translucent borders (`rgba(255, 255, 255, 0.08)`) and panel surfaces (`rgba(17, 20, 29, 0.7)`) to blend smoothly with backdrops. Shadows are kept flat or extremely subtle, relying instead on clean border lines and surface layering to establish depth.

Primary buttons are pill-shaped (`9999px` radius) to signify main call-to-actions, whereas input controls, secondary buttons, and tables use a precise `6px` or `8px` corner radius.

---

## 2. Color Palette & Roles

### Brand
- **Grass Emerald** (`#10b981`): Primary brand accent, logos, active navigation indicator, focus outlines.
- **Interactive Green** (`#059669`): Hover states, links, success signals.
- **Accent Glow** (`rgba(16, 185, 129, 0.15)`): Translucent green highlights for focus, borders, and success badges.

### Neutral Scale (Dark Mode)
- **Deep Void** (`#0b0d12`): Primary body canvas background.
- **Dark Surface** (`#11141d`): Main cards, panels, layout wrappers.
- **Light Surface** (`rgba(255, 255, 255, 0.03)`): Active tables, input backgrounds.
- **Border Dark** (`rgba(255, 255, 255, 0.08)`): Sub-section separators, table borders.
- **Border Medium** (`rgba(255, 255, 255, 0.15)`): Prominent borders, card boundaries.
- **Text Main** (`#f9fafb`): Default color for primary text and headings.
- **Text Muted** (`#9ca3af`): Labels, descriptions, icons, metadata.
- **Text Dim** (`#6b7280`): Placeholders, disabled states.

### Status Colors
- **Success** (`#10b981`): Approved players, paid fees, net-positive balance.
- **Warning** (`#f59e0b`): Unpaid bills, pending registrations, draft items.
- **Danger** (`#ef4444`): Deleted items, critical outstanding dues, voided expenses.

---

## 3. Typography Rules

### Font Families
- **Headings & Display**: `'Outfit', sans-serif`
- **Body & Controls**: `'Inter', sans-serif`
- **Technical & Labels**: `SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display Title | Outfit | 32px (2.00rem) | 700 | 1.10 (tight) | -0.02em | Main dashboard page headers |
| Section Heading | Outfit | 20px (1.25rem) | 600 | 1.25 | -0.01em | Sub-sections, card titles |
| Body Main | Inter | 15px (0.94rem) | 400 | 1.50 | normal | Standard paragraphs |
| Body Muted | Inter | 14px (0.88rem) | 400 | 1.45 | normal | Help text, table descriptions |
| Button Label | Inter | 14px (0.88rem) | 600 | 1.15 | normal | Button text (centered) |
| Monospace Label | Monospace | 12px (0.75rem) | 500 | 1.20 | 1.2px | Uppercase, status labels, balances |

---

## 4. Component Stylings

### Buttons
- **Primary Pill**: Background `#10b981`, Text `#0b0d12`, Radius `9999px`, Hover background `#059669`, transition `0.2s`.
- **Secondary**: Background `rgba(255, 255, 255, 0.05)`, Border `1px solid rgba(255, 255, 255, 0.15)`, Text `#f9fafb`, Radius `6px`.
- **Danger**: Background `#ef4444`, Text `#ffffff`, Radius `6px`, Hover background `#dc2626`.

### Cards & Container Panels
- Background `rgba(17, 20, 29, 0.7)` with `backdrop-filter: blur(16px)`.
- Border `1px solid rgba(255, 255, 255, 0.08)`.
- Radius `12px` or `16px`.
- Card Hover: Hover borders scale to `rgba(16, 185, 129, 0.3)` with a subtle translation `translateY(-2px)`.

### Input Controls
- Background `rgba(255, 255, 255, 0.03)`.
- Border `1px solid rgba(255, 255, 255, 0.12)`.
- Radius `6px` or `8px`.
- Focus Glow: Border `#10b981`, shadow ring `0 0 0 3px rgba(16, 185, 129, 0.2)`.

### Badges & Status Tags
- Solid borders with highly translucent matching backgrounds.
- Success: Background `rgba(16, 185, 129, 0.12)`, text `#10b981`, border `1px solid rgba(16, 185, 129, 0.25)`.
- Danger: Background `rgba(239, 68, 68, 0.12)`, text `#ef4444`, border `1px solid rgba(239, 68, 68, 0.25)`.
- Warning: Background `rgba(245, 158, 11, 0.12)`, text `#f59e0b`, border `1px solid rgba(245, 158, 11, 0.25)`.

---

## 5. Do's and Don'ts

### Do
- Maintain a deep dark backdrop throughout the entire viewport (`#0b0d12`).
- Use translucent borders for panel container grouping (`rgba(255, 255, 255, 0.08)`).
- Restrict pure emerald green (#10b981) to interactive controls, navigation indicators, logos, and focused input state borders.
- Wrap numerical statistics, transaction IDs, statuses, and currencies in a monospace font family wrapper.
- Preserve proper print layouts so PDF generating is clean.

### Don't
- Don't use bright solid backgrounds on layout elements or panels.
- Don't use heavy text styling (e.g. 800 weight) for dense body descriptions.
- Don't let buttons or select options have sharp corners (unless marked as secondary/pill).
- Don't add arbitrary drop shadows to elements on dark backgrounds (use translucent highlights).
