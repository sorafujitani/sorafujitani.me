# sorafujitani.me

Personal blog and portfolio site for Sora Fujitani.

## Tech Stack

- **Framework**: Astro (static site generation)
- **Runtime**: Bun
- **Language**: TypeScript (strict mode)
- **Content**: Markdown / MDX with Astro Content Collections
- **Styling**: Scoped CSS with CSS variables (dark theme, cyan accent `#00d8ff`)
- **Syntax Highlighting**: Shiki with custom theme
- **OG Images**: Generated at build time via Satori + Resvg

## Commands

```bash
bun run dev       # Start dev server
bun run build     # Build for production
bun run preview   # Preview production build
bun run new-post  # Create a new blog post
```

## Project Structure

```
src/
├── components/     # Reusable Astro components
├── content/        # Content collections (blog, about, talks)
├── layouts/        # BlogLayout.astro (single layout for all pages)
├── lib/            # Utilities (date, posts, remark/shiki plugins)
├── pages/          # File-based routing
│   ├── blog/       # Blog list + [slug] detail pages
│   ├── og/         # OG image generation endpoints
│   ├── pulls/      # GitHub PR viewer (client-side fetch)
│   └── rss.xml.ts  # RSS feed
├── styles/         # global.css (CSS variables, base styles)
└── types/          # Shared TypeScript interfaces
```

## Content Collections

Defined in `src/content/config.ts`. Three collections:
- **blog**: Posts with frontmatter (title, description, pubDate, tags, draft, pinned, externalUrl)
- **about**: Single MDX page
- **talks**: Presentation history

## Key Conventions

- **Path aliases**: `@components/`, `@layouts/`, `@lib/`, `@types`, `@styles/` (defined in tsconfig.json)
- **CSS**: Use CSS variables from `global.css` (`--color-accent`, `--color-bg`, `--color-text`, etc.). Never hardcode color values.
- **External posts**: Blog posts with `externalUrl` link to Zenn/external sites. Zenn articles are fetched at build time via API.
- **No test framework**: Verify changes with `bun run build`.
