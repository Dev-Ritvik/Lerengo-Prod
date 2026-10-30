# LerenGO Design Language

Baseline reviewed: `0a5c57f` on `main`, restored from the April 11 product direction with only the three platform modules: CampusGO, SkillGO, and ForgeGO.

This document replaces the older Campus Network MVP design note. It describes the design language that exists in the current code and should be preserved before any future implementation.

## 1. Design Intent

LerenGO is designed as a serious education and project platform, not a playful landing site. The product should feel:

- calm
- trusted
- premium
- institutional
- practical
- focused on student outcomes

The design supports a journey from learning to building to campus-backed support. The UI must not drift into random colors, marketing clutter, heavy decoration, or unrelated visual systems.

## 2. Product Identity

The current product is one platform with three modules:

- CampusGO: verified campus workspace for notes, mentorship, campus community, and project support
- SkillGO: practical course and certificate lane
- ForgeGO: idea intake, research, patent, publication, and guided build lane

The important design rule is that these are modules inside one LerenGO identity. They can have their own page structures, but they should share the same visual language, typography, button behavior, radius, motion, and palette.

## 3. Color System

The working palette is defined mainly in:

- `web/src/app/globals.css`
- `web/src/app/page.module.css`
- `web/src/components/info-page-shell.module.css`
- `web/src/app/(auth)/auth-flow.module.css`
- module page CSS files under `web/src/app/*/page.module.css`

### Charcoal Grey

Charcoal is the product atmosphere and primary background.

Representative values:

- `#1f2933`
- `#23282f`
- `#252b32`
- `#2b3138`
- `#323941`

Use charcoal for:

- full page backgrounds
- headers
- public landing sections
- dark cards
- admin shells
- footer
- modal-like surfaces

### Off White

Off white is the main reading color on dark surfaces.

Representative values:

- `#f5f0e8`
- `#f9fafb`
- `rgba(245, 240, 232, 0.74)`
- `rgba(249, 250, 251, 0.78)`

Use off white for:

- hero headings
- section titles
- important labels
- page copy on charcoal surfaces
- footer copy

### Cool Grey

Cool grey is the accent system.

Representative values:

- `#96a1ab`
- `#bcc4cb`
- `#6b7280`
- `#8b96a0`
- `#a0aab3`

Use cool grey for:

- active buttons
- accent pills
- status dots
- subtle rings
- muted supporting copy
- hover/active elevation

## 4. Palette Ratio

The intended ratio is:

- 60 percent charcoal
- 30 percent off white
- 10 percent cool grey

This ratio is visible in the homepage and info pages. Do not introduce loud accent colors unless a state requires it, such as success, warning, or danger.

## 5. Typography

The app imports Sora in `web/src/app/globals.css`.

Typography patterns:

- hero headlines are large, heavy, and editorial
- section titles use strong weight and tight line-height
- body text is calm, medium sized, and lower contrast
- eyebrow labels are uppercase, letter-spaced, and cool grey
- buttons are bold and compact

Important CSS variables:

- `--type-display`
- `--type-hero`
- `--type-section`
- `--type-title`
- `--type-body-lg`
- `--type-body`
- `--type-body-sm`

Avoid font changes unless there is a strong reason. The typography is one of the clearest parts of the brand.

## 6. Layout Language

The layout is spacious but not empty.

Common structure:

- full viewport charcoal page
- constrained max-width canvas
- glassy top header
- centered hero or editorial split depending on page
- section rhythm with large blocks
- card grids for repeated content
- CTA band near the bottom
- dark footer with legal links

Key containers:

- homepage max width: about `1280px`
- global content max: `1420px`
- info page max width: about `1180px`

Spacing uses `clamp()` heavily. This is important for responsive design and should be preserved.

## 7. Cards

Cards should be dark, quiet, elevated surfaces.

Current card language:

- charcoal or translucent dark fill
- large radius, often 24px to 28px on marketing surfaces
- soft shadow
- subtle border or inset ring
- strong title, softer body copy
- restrained hover lift

Admin cards are denser but still dark and polished. Public page cards are more spacious.

Do not make cards white on the public module surfaces unless the page intentionally switches into a form or auth panel.

## 8. Buttons

Primary buttons:

- cool grey gradient
- dark charcoal text
- soft drop shadow
- rounded pill or rounded rectangle
- slight lift on hover

Secondary buttons:

- translucent charcoal surface
- subtle inset ring
- off-white text
- gentle hover brightness

Danger, success, and warning are used only for system states. They should not become brand colors.

## 9. Motion

Motion is subtle and structural:

- route transition controller applies fade/blur/translate state
- scroll reveal controller adds delayed reveal classes
- buttons/cards lift slightly on hover
- loading skeletons use slow shimmer

Relevant files:

- `web/src/components/page-transition-controller.tsx`
- `web/src/components/scroll-reveal-controller.tsx`
- `web/src/components/transition-link.tsx`
- `web/src/app/globals.css`

Respect `prefers-reduced-motion`. Do not add heavy animation loops or decorative motion.

## 10. Page-Specific Design Notes

### Homepage

File: `web/src/app/page.tsx`
Style: `web/src/app/page.module.css`

The homepage explains the system. It should keep the three-module story clear:

1. SkillGO
2. ForgeGO
3. CampusGO

The design is centered, dark, editorial, and high-contrast. Module cards should remain equal members of one platform.

### CampusGO

File: `web/src/app/campus-network/page.tsx`
Style: `web/src/app/campus-network/page.module.css`

CampusGO is verified and university-scoped. It is more operational than the homepage. It uses live stats, service cards, weekly banners, and utility links.

Do not treat CampusGO as a separate fourth public module. In this baseline, it is one of the three core modules.

### SkillGO

File: `web/src/app/courses/page.tsx`
Style: `web/src/app/courses/page.module.css`

SkillGO has course catalog energy while staying in the LerenGO system. It uses partner signals, course columns, category chips, and course cards.

### ForgeGO

File: `web/src/app/labs/page.tsx`
Style: `web/src/app/labs/page.module.css`

ForgeGO is the idea/build lane. It should feel like a serious review pipeline, not a casual idea wall.

### Auth and Onboarding

Files:

- `web/src/app/signin/page.tsx`
- `web/src/app/(auth)/signup/page.tsx`
- `web/src/app/onboarding/university/page.tsx`
- `web/src/app/onboarding/campus-profile/page.tsx`
- `web/src/app/(auth)/verify/page.tsx`

Auth pages invert into off-white cards on charcoal backgrounds. This makes forms readable while preserving brand atmosphere.

## 11. Responsive Rules

The design must remain polished on mobile:

- nav wraps instead of overflowing
- cards collapse to one column
- buttons can become full width
- large type uses clamp values, not viewport-only scaling
- text should not collide with cards or actions
- no horizontal overflow

The global CSS already sets `overflow-x: clip` in several shells. Preserve that.

## 12. What Not To Change Randomly

Do not randomly change:

- Sora font
- charcoal/off-white/cool-grey palette
- button shape and hover behavior
- large rounded dark cards
- route transition and reveal behavior
- module order or three-module positioning
- footer style on info pages and public pages
- profile menu behavior
- campus verification gate

Before implementing future UI work, compare against this document and the existing pages.
