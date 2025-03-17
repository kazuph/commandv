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
      <html>
        <head>
          <meta charSet="utf-8" />
          <meta content="width=device-width, initial-scale=1" name="viewport" />
          <link rel="stylesheet" href="https://cdn.simplecss.org/simple.min.css" />
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
          {import.meta.env.PROD ? (
            <script type="module" src="/static/client.js"></script>
          ) : (
            <script type="module" src="/src/client.tsx"></script>
          )}
        </head>
        <body>
          <div id="root"></div>
        </body>
      </html>
    )
  )
})

export default app
