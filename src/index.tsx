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
      <html style={{width: '100%', margin: 0, padding: 0}}>
        <head>
          <meta charSet="utf-8" />
          <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" name="viewport" />
          <title>CommandV</title>
          <link rel="icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMzhiZGY4IiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM0ZjQ2ZTUiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNncmFkKSIgcng9IjE1IiByeT0iMTUiLz4KICA8ZyBmaWxsPSIjZmZmZmZmIj4KICAgIDwhLS0gQ29tbWFuZCAo4oyWKSBzeW1ib2wgLS0+CiAgICA8cGF0aCBkPSJNMjUgMjUgSDQwIFY0MCBIMjUgWiIgLz4KICAgIDxwYXRoIGQ9Ik02MCAyNSBINzUgVjQwIEg2MCBaIiAvPgogICAgPHBhdGggZD0iTTI1IDYwIEg0MCBWNzUgSDI1IFoiIC8+CiAgICA8cGF0aCBkPSJNNjAgNjAgSDc1IFY3NSBINjAgWiIgLz4KICAgIDxwYXRoIGQ9Ik00MCA0MCBINjAgVjYwIEg0MCBaIiAvPgogIDwvZz4KPC9zdmc+" />
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
          {/* 公式CDNからTailwind CSS v4を読み込む */}
          <script src="https://cdn.tailwindcss.com"></script>
          {/* TailwindのCDN用設定 */}
          <script>
            {`
            tailwind.config = {
              theme: {
                extend: {}
              }
            }
            `}
          </script>
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
