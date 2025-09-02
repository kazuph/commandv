<div align="center">
  <img src="https://raw.githubusercontent.com/kazuph/commandv/main/public/commandv-banner.svg" alt="CommandV Banner" width="600">
  <h3>An instant previewer for Claude Artifacts</h3>
  <p>Just paste your component code and see it rendered immediately</p>
</div>

## 🚀 Features

- **Instant Preview**: Paste React component code and see it rendered immediately
- **Syntax Highlighting**: Built-in code editor with syntax highlighting
- **Library Support**: Comes with support for popular libraries:
  - `recharts` - Data visualization charts
  - `lodash` - Utility functions
  - `papaparse` - CSV parsing
  - React Icons - Various icon sets
- **Export to Image**: Save your component previews as high-quality images with proper gradient rendering

## Share Links (URL共有)

- After saving a diagram, click the Share button to generate a secret URL like `/s/<64-hex-token>` and copy it to your clipboard.
- Only people with the URL can view; the link is unguessable (256-bit token).
- Shared pages are delivered with `X-Robots-Tag: noindex, nofollow, noarchive` and meta robots, plus `Referrer-Policy: no-referrer` to reduce bot discovery via crawlers and referrers. `robots.txt` also disallows `/s/`.
- You can disable or rotate the link via API: `POST /api/diagrams/:id/share` with `{ action: 'disable' | 'rotate' }`.

### Sharing Behavior
- Logged-in share links: no expiration (∞).
- Anonymous Quick Share: 3-day expiration; after expiry, login is required to view.

### Anonymous Quick Share (No Login)
- Use `クイック共有` to create a shareable link without logging in.
- Expiration: 3 days. After expiry, the link stops resolving publicly; content remains stored and is viewable only after login.
- Endpoint: `POST /api/diagrams/guest` with `{ title, code, mode, imageDataUrl? }` returns `{ id, shareUrl, expiresAt }`.
- Rate limits: basic per-IP limits (10/min, 100/day). Exceeding returns HTTP 429.
- **No Setup Required**: Works directly in the browser
- **Modern UI**: Clean, Apple-inspired design

## 🔧 Installation

### Development

```bash
# Clone the repository
git clone https://github.com/kazuph/commandv.git
cd commandv

# Install dependencies
pnpm install

# Start the development server
pnpm run dev
```

### Production

```bash
# Build for production
pnpm run build

# Preview the production build
pnpm run preview
```

## 📖 Usage

1. Open the application in your browser
2. Paste your React component code anywhere on the page (using ⌘V)
3. View your component rendered in real-time
4. Use the "Show Code" button to toggle code editor visibility
5. Edit the code in the editor if needed and run it
6. Use "Save as Image" to export your component as an image

## 🏗️ Deployment

CommandV is built to be deployed to Cloudflare Workers. To deploy:

```bash
# Build and deploy
pnpm run deploy
```

This will deploy the application to Cloudflare Workers under the `commandv` domain.

## 🛠️ Tech Stack

- [React](https://reactjs.org/) - UI library
- [Hono](https://hono.dev/) - Fast web framework for Cloudflare Workers
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [html-to-image](https://github.com/bubkoo/html-to-image) - High-quality image capture with proper gradient rendering
- [Babel](https://babeljs.io/) - JavaScript compiler
- [Recharts](https://recharts.org/) - React charting library
- [Vite](https://vitejs.dev/) - Frontend tooling
- [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless platform

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgements

- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Babel](https://babeljs.io/)
- [React Icons](https://react-icons.github.io/react-icons/)
- All the included libraries that make component previews rich and interactive
