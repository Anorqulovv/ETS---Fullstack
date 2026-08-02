export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Something went wrong — Edu CRM</title>
    <style>
      html, body { height: 100%; margin: 0; }
      body {
        display: flex; align-items: center; justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
        background: #0b0b0f; color: #f4f4f5; padding: 24px;
      }
      .card { text-align: center; max-width: 420px; }
      h1 { font-size: 1.25rem; font-weight: 600; margin: 0 0 8px; }
      p { color: #a1a1aa; font-size: 0.9rem; margin: 0 0 20px; }
      a {
        display: inline-flex; align-items: center; justify-content: center;
        padding: 10px 18px; border-radius: 8px; background: #f4f4f5; color: #0b0b0f;
        text-decoration: none; font-weight: 500; font-size: 0.9rem;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Something went wrong</h1>
      <p>Please try refreshing the page or head back home.</p>
      <a href="/">Go home</a>
    </div>
  </body>
</html>`;
}
