# CommandV

<div align="center">
  <img src="https://raw.githubusercontent.com/kazuph/commandv/main/public/logo.png" alt="CommandV Logo" width="120" height="120">
  <h3>An instant previewer for Claude Artifacts</h3>
  <p>Just paste your component code and see it rendered immediately</p>
</div>

## 🚀 Features

- **Instant Preview**: Paste React component code and see it rendered immediately
- **Syntax Highlighting**: Built-in code editor with syntax highlighting
- **Library Support**: Comes with support for popular libraries:
  - `recharts`, `d3`, `Chart.js`, `Plotly`
  - `mathjs`, `lodash`
  - `Tone.js`, `Three.js`
  - React Icons and more
- **Export to Image**: Save your component previews as images
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

- [React](https://reactjs.org/)
- [Hono](https://hono.dev/) - Fast web framework for Cloudflare Workers
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
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
- All the included libraries that make component previews rich and interactive
