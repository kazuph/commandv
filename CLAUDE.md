# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies (requires pnpm)
pnpm install

# Start development server (runs on http://localhost:3000)
pnpm run dev

# Build for production (creates both client and server builds)
pnpm run build

# Preview production build locally using Wrangler
pnpm run preview

# Deploy to Cloudflare Workers
pnpm run deploy
```

## Architecture Overview

CommandV is an instant React component previewer built for Cloudflare Workers edge deployment. Key architectural decisions:

### Dual Build System
- **Client Build**: Vite bundles the React app into `dist/` for browser execution
- **Server Build**: Vite bundles the Hono server into `server-build/` for Cloudflare Workers
- Both builds run sequentially via `pnpm run build`

### Core Components
- **`src/index.tsx`**: Hono server entry point - handles SSR and serves the client app
- **`src/client.tsx`**: Client-side React app entry point
- **`src/components/ComponentPreviewer.tsx`**: Main component that handles code pasting, transpilation via Babel, and live rendering

### Code Execution Flow
1. User pastes React component code anywhere on the page
2. ComponentPreviewer captures the paste event
3. Code is transpiled using @babel/standalone in the browser
4. Component is dynamically rendered with error boundaries
5. Available libraries (recharts, lodash, papaparse, react-icons) are pre-loaded in the execution context

### Styling Strategy
- Tailwind CSS v4 loaded via CDN (not build-time processed)
- Custom CSS in `src/styles/` for specific UI elements
- Apple-inspired design system with careful attention to gradients and shadows

### Image Export
The "Save as Image" feature uses html-to-image with specific handling for:
- High-quality rendering of gradients and shadows
- Transparent backgrounds for flexibility
- Proper scaling for retina displays

## Important Technical Details

### No Test Framework
Currently no testing framework is configured. When adding tests, consider the edge runtime constraints.

### Cloudflare Workers Constraints
- No Node.js APIs available
- Must use Web Standards APIs only
- Bundle size matters for cold start performance

### Development Port
Vite is configured to run on port 3000 (not the default 5173) via `vite.config.ts`

### TypeScript Configuration
- Strict mode enabled
- Cloudflare Workers types included
- JSX configured for React 18

### Monaco Editor Integration
Monaco Editor is loaded dynamically with TypeScript/JSX support pre-configured for the code editing experience.