# LerenGO Design Language Guide

Last updated: 2026-04-06

This file is the design reference for future chats, designers, and developers working on LerenGO. Its purpose is simple: preserve visual consistency. If someone starts a fresh chat and asks for UI changes, this file should stop the design from drifting into random colors, louder styling, or mismatched components.

## Core intent

LerenGO should feel:

- calm
- serious
- premium
- modern
- deliberate
- trust-oriented

It should **not** feel:

- loud
- playful in a startup-demo way
- neon
- trendy for the sake of trend
- overloaded with decorative cards
- visually inconsistent across pages

This product deals with:

- campus trust
- verification
- notes
- mentorship
- structured learning
- certificates

So the UI has to feel dependable first, stylish second.

## The color system

The current palette is built around three tones:

### 1. Charcoal grey

This is the base of the product.

Use charcoal grey for:

- page backgrounds
- shell surfaces
- section containers
- major structural panels
- the general visual atmosphere

Representative values:

- `#23282f`
- `#2b3138`
- `#323941`

### 2. Off-white

This is the main text and reading color.

Use off-white for:

- hero headlines
- section titles
- important labels
- primary readable text on dark surfaces

Representative values:

- `#f5f0e8`
- soft version: `rgba(245, 240, 232, 0.74)`

### 3. Cool grey

This is the accent tone.

Use cool grey for:

- active buttons
- status dots
- subtle emphasis
- controlled visual hierarchy
- calm highlight moments

Representative values:

- `#96a1ab`
- `#bcc4cb`

## 60 / 30 / 10 rule

The design should roughly follow:

- **60% charcoal grey**
- **30% off-white**
- **10% cool grey**

This rule matters because it keeps the system balanced.

If cool grey becomes too dominant:

- the UI looks washed out
- hierarchy gets weaker
- active states lose meaning

If off-white becomes too weak:

- readability drops
- the interface stops feeling premium

If charcoal is broken by random accent colors:

- the product stops looking like one system

## Typography rules

Typography should do most of the heavy lifting.

Rules:

- headlines should be large and confident
- letter spacing on major headings should be slightly tight
- hero lines should feel editorial and strong
- body text should be secondary and restrained
- microcopy should not dominate the page

Good typography is more important than extra decoration. If a section only works because of gradients, icons, or visual tricks, it is probably off-language.

## Hero section philosophy

The current direction is toward **simpler centered hero statements**.

That means:

- preserve one strong message
- reduce side clutter
- remove duplicate calls to action if they are not needed
- reduce oversized side gutters
- keep the fold clean

Avoid:

- giant side promo cards next to every hero
- too much paragraph copy at the top
- duplicate search or duplicate CTA areas
- decorative blocks competing with the main headline

A hero should often succeed with:

- one centered line
- strong scale
- controlled spacing

## Layout principles

LerenGO should feel spacious, but not empty.

Use:

- large max-width containers
- generous but disciplined padding
- consistent section spacing
- broad, stable page rhythm
- clean card grids

Do not use:

- unnecessary empty gutters
- awkward dead space around short content
- sidebars when a top-nav layout is cleaner
- cluttered dashboard density on public pages

The visual system should feel composed, not crowded.

## Component language

### Buttons

There are two major button families:

#### Primary / active buttons

These should use:

- cool-grey filled treatment
- dark ink text
- soft shadow
- premium but restrained emphasis

They are for:

- important route actions
- active tab-style actions
- stronger CTA buttons

#### Secondary / ghost buttons

These should use:

- dark translucent fill
- subtle inset ring
- off-white or soft off-white text

They are for:

- secondary navigation
- less important actions
- contextual actions on cards

### Important button rule

Do **not** bring back:

- orange outlines
- orange hover borders
- loud stroke-based hover states
- bright flashy accents

Hover emphasis should happen through:

- shadow
- slight lift
- subtle brightness change

Not through aggressive borders.

### Cards

Cards should feel like quiet elevated surfaces.

Use:

- dark surfaces
- rounded corners
- subtle inset border/ring
- soft shadow
- clear title
- softer body copy

Cards may feel premium, but they should not feel overdesigned.

### Pills and badges

Pills should be:

- rounded
- compact
- legible
- low-noise

Good examples:

- cool-grey status dot pills
- compact chips
- low-contrast meta pills

Bad examples:

- oversized glossy badges
- too many pill rows competing at once
- hard-framed pills with loud contrast

### University badge pattern

The preferred university badge is now the compact pill used across:

- Notes
- Mentorship
- Community
- Campus Network

That pattern is:

- university logo
- university name
- small cool-grey status dot
- one compact horizontal pill

Do not expand it into a large information block unless there is a very specific functional reason.

### Reviews and FAQs

Testimonials and FAQ blocks should use the same surface logic as the rest of the product:

- dark card surfaces
- same shadow language
- same border radius family
- same spacing rhythm
- same headline/body hierarchy

Do not suddenly switch to bright white content blocks inside the dark product shell.

## Motion language

Motion should be subtle.

Allowed:

- gentle reveal on scroll
- shadow increase on hover
- small translateY lift
- restrained transitions

Avoid:

- bouncy motion
- dramatic zooms
- flashy looping effects
- animated borders
- movement that competes with content

If motion draws attention to itself, it is probably too much.

## Navigation philosophy

The product has moved away from heavy sidebars in many places and toward cleaner top navigation patterns.

Prefer:

- top navigation when it reduces clutter
- clearer route grouping
- simpler utility bars

Avoid:

- duplicate search bars
- sidebars that waste width
- navigation systems that feel disconnected between pages

## What future chats must preserve

Future chats should preserve:

- charcoal / off-white / cool-grey palette
- 60 / 30 / 10 balance
- typography-first hierarchy
- calm premium tone
- simple centered heroes where possible
- compact university pill
- shadow-based hover language
- consistent dark card system
- restrained public-page composition

## What future chats must avoid

Future chats should avoid:

- purple bias
- orange outline styling
- bright random accent colors
- white-page design for core product routes
- extra hero promo panels unless clearly necessary
- duplicated search inputs
- dashboard clutter on landing pages
- one-off redesigns that ignore the rest of the app
- mixing multiple visual systems in one product

## Best prompt for a new chat

If you start a new chat and want it to stay aligned, use this:

> Read `DESIGN_LANGUAGE_GUIDE.md` first. Preserve the current LerenGO design language: charcoal grey backgrounds, off-white text, cool-grey accents, 60/30/10 balance, typography-first hierarchy, calm premium mood, compact university badge, shadow-based hover states, and simple centered hero sections. Do not introduce purple, orange borders, loud gradients, duplicate search bars, or mismatched component patterns. Keep all page changes visually consistent with `/`, `/campus-network`, `/browse-notes`, `/mentorship`, `/community`, and `/courses`.

That prompt is short enough to reuse, but specific enough to stop most UI drift.

## Final instruction

If a future chat proposes a design change that breaks this file, the default answer should be:

- reject the drift
- keep the palette
- keep the spacing rhythm
- keep the calm system
- only make exceptions when there is a clear product reason

This file should now be treated as the current visual source of truth for LerenGO.
