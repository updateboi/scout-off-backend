import { Router, Request, Response } from 'express';
import { openApiSpec } from '../openapi/spec';

const router = Router();

/**
 * GET /api/docs
 * Returns the OpenAPI 3.0.3 specification as JSON.
 * No authentication required — the spec is public.
 */
router.get('/', (_req: Request, res: Response) => {
  res.json(openApiSpec);
});

/**
 * GET /api/docs/ui
 * Serves a minimal self-contained Swagger UI HTML page.
 * Points at GET /api/docs for the spec JSON so it always stays in sync.
 */
router.get('/ui', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ScoutOff API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/docs',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      deepLinking: true,
    });
  </script>
</body>
</html>`);
});

export default router;
