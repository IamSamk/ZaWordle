# WordleOP

A cinematic take on the daily word puzzle. WordleOP opens with a luminous landing sequence—glowing cursor, flowing glyph shower, and metallic title—before flowing into the streak-focused gameplay shell.

## Highlights

* **Immersive Landing Canvas** – Tailwind, framer-motion, and custom gradients layer the hero with a curated 100-word skyline and a responsive hero headline.
* **Letter Shower** – A Three.js shader turns an atlas of glyphs into rotating, drifting particles that feel like typographic leaves.
* **Reactive Cursor** – Dual-orb cursor blooms over interactive elements, emits a soft glow, and leaves behind a trail of characters.
* **Refined Word Pool** – Landing copy draws from a handpicked vocabulary with filtering rules that keep the ambience elegant.
* **Timer** - A timer to track your speed and challenge your friends.
## Quick Start

```bash
pnpm install
pnpm dev
```

Visit `http://localhost:3000` to experience the animated landing page. The game itself lives at `/play` and is accessible via the **Start Game** CTA.

## Project Structure

```
src/
  app/
    page.tsx         # Cinematic landing page
    play/page.tsx    # Game shell entry point
  components/
    game/
      cursor-trail.tsx        # Glowing dual-orb cursor and trail
    landing/
      landing-experience.tsx  # Hero layout, word skyline, CTA
      letter-shower.tsx       # WebGL particle system for the drift
```

## Signature Animations

| Element | Stack | Description |
| --- | --- | --- |
| Hero headline | framer-motion + gradient masks | Pointer-tracked shimmer across the "WORDLE" logotype |
| Letter shower | Three.js ShaderMaterial | Point sprites sourced from a canvas atlas for crisp glyph particles |
| Cursor | framer-motion springs | White orb with pulsing glow, hover bloom, and alphabet trail |

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Turbopack development server |
| `pnpm build` | Generate a production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint over the project |

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS and shadcn/ui primitives
- framer-motion for choreography
- Three.js for the glyph particle field

## Contributing

1. Fork the repository and create a feature branch.
2. Run `pnpm lint` to ensure code quality.
3. Include screenshots or short clips when altering visuals so reviewers can see the landing experience.

## Acknowledgements

- Helvetiker font geometry courtesy of the official Three.js examples.
- Visual inspiration gathered from modern Wordle fan art and ambient typography studies.
