import { Hono } from 'hono'
import { renderToString } from 'react-dom/server'

type Env = {
  Bindings: {
    MY_VAR: string
  }
}

const app = new Hono<Env>()

app.get('/api/clock', (c) => {
  return c.json({
    var: c.env.MY_VAR, // Cloudflare Bindings
    time: new Date().toLocaleTimeString()
  })
})

app.get('*', (c) => {
  return c.html(
    renderToString(
      <html style={{width: '100%', height: '100%', margin: 0, padding: 0}}>
        <head>
          <meta charSet="utf-8" />
          <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" name="viewport" />
          <title>CommandV</title>
          <link rel="icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTM1IDMwaDMwdjVoNXYzMGgtNXY1aC0zMHYtNWgtNXYtMzBoNXYtMzB6TTQwIDM1di01aDIwdjVoNXYyMGgtNXY1aC0yMHYtNWgtNXYtMjBoNXoiIGZpbGw9IiMwMDAiLz48L3N2Zz4=" />
          <style dangerouslySetInnerHTML={{__html: `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
            html, body, #root { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; overflow-x: hidden !important; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
            * { box-sizing: border-box; }
            :root {
              color-scheme: light;
              --app-bg: #ffffff;
              --text-primary: #000000;
            }
            body {
              font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
          `}} />
          {/* CDNからTailwind CSSを読み込む */}
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@^2/dist/tailwind.min.css" rel="stylesheet" />
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@^2/dist/components.min.css" rel="stylesheet" />
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@^2/dist/utilities.min.css" rel="stylesheet" />
          <link href="/static/style.css" rel="stylesheet" />
          {import.meta.env.PROD ? (
            <script type="module" src="/static/client.js"></script>
          ) : (
            <script type="module" src="/src/client.tsx"></script>
          )}
        </head>
        <body style={{margin: 0, padding: 0, overflowX: 'hidden', width: '100%', maxWidth: '100%', backgroundColor: 'white'}}>
          <div id="root" style={{width: '100%', maxWidth: '100%'}}></div>
        </body>
      </html>
    )
  )
})

export default app
