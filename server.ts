import express from 'express';
import { createServer as createViteServer } from 'vite';

const app = express();
const port = 3000;

app.use(express.json());

// API para verificar si un dominio existe y responde con 200 OK
app.post('/api/check-domain', async (req, res) => {
  let { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ ok: false, status: 400, message: 'URL no válida' });
  }

  url = url.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  try {
    const targetUrl = new URL(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Robotaylon/1.0 (+https://robotaylon.dev/agent; security-audit; gentle-pace)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      redirect: 'follow',
      signal: controller.signal
    });

    clearTimeout(timeout);

    const is200 = response.status === 200;
    const cleanHostname = targetUrl.hostname.replace(/^www\./, '');
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${cleanHostname}&sz=128`;

    let description: string | null = null;
    let hasSitemap = false;
    const fetchStartTime = Date.now();

    if (is200) {
      try {
        const html = await response.text();
        const descMatch =
          html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
          html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
          html.match(/<meta\s+[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
          html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i) ||
          html.match(/<meta\s+[^>]*name=["']twitter:description["'][^>]*content=["']([^"']+)["']/i);

        if (descMatch && descMatch[1]) {
          description = descMatch[1]
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
        }
      } catch (bodyError) {
        // Ignorar
      }

      // Comprobar sitemap.xml rápidamente
      try {
        const sitemapUrl = `${targetUrl.protocol}//${cleanHostname}/sitemap.xml`;
        const sitemapCtrl = new AbortController();
        const sitemapTimeout = setTimeout(() => sitemapCtrl.abort(), 2500);

        const sitemapRes = await fetch(sitemapUrl, {
          method: 'GET',
          headers: { 'User-Agent': 'Robotaylon/1.0' },
          signal: sitemapCtrl.signal
        });
        clearTimeout(sitemapTimeout);

        if (sitemapRes.status === 200) {
          hasSitemap = true;
        }
      } catch (sitemapErr) {
        hasSitemap = false;
      }
    }

    const latencyMs = Date.now() - fetchStartTime;

    // Cálculo matemático de los 100 puntos
    let score = 0;
    if (is200) score += 20; // 200 OK = 20 pts
    if (description && description.length > 5) score += 25; // Descripción = 25 pts
    if (hasSitemap) score += 20; // Sitemap = 20 pts
    score += 15; // Favicon detectado = 15 pts

    // Velocidad en milisegundos (hasta 20 pts)
    if (latencyMs < 300) {
      score += 20;
    } else if (latencyMs < 700) {
      score += 15;
    } else if (latencyMs < 1200) {
      score += 10;
    } else {
      score += 5;
    }

    // Normalizar a máximo 100 y mínimo 0
    score = Math.min(100, Math.max(0, score));

    return res.json({
      ok: is200,
      status: response.status,
      statusText: response.statusText,
      resolvedUrl: response.url,
      domain: cleanHostname,
      favicon: faviconUrl,
      description: description,
      hasSitemap: hasSitemap,
      latencyMs: latencyMs,
      reliabilityScore: score
    });
  } catch (error: any) {
    // Si falla HTTPS directo, intentar HTTP como fallback rápido
    if (url.startsWith('https://')) {
      try {
        const httpUrl = url.replace(/^https:\/\//i, 'http://');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(httpUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Robotaylon/1.0 (+https://robotaylon.dev/agent; security-audit; gentle-pace)'
          },
          redirect: 'follow',
          signal: controller.signal
        });
        clearTimeout(timeout);

        return res.json({
          ok: response.status === 200,
          status: response.status,
          statusText: response.statusText,
          resolvedUrl: response.url
        });
      } catch (fallbackError) {
        // Fallback también falló
      }
    }

    return res.json({
      ok: false,
      status: 0,
      error: error.name === 'AbortError' ? 'Timeout: el servidor no respondió a tiempo' : 'No se pudo conectar al servidor'
    });
  }
});


// API para verificar la propiedad del dominio mediante etiqueta HTML o archivo robotaylon.txt
app.post('/api/verify-domain', async (req, res) => {

  let { domain, token, method } = req.body;

  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ ok: false, verified: false, message: 'Dominio requerido' });
  }
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ ok: false, verified: false, message: 'Token de verificación requerido' });
  }

  const cleanToken = token.trim();
  let cleanDomain = domain.trim();
  cleanDomain = cleanDomain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();

  const baseUrl = `https://${cleanDomain}`;

  try {
    if (method === 'meta') {
      // Método 1: Verificar etiqueta <meta name="robotaylon-verification" content="...">
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      let html = '';
      let fetchSuccess = false;

      try {
        const response = await fetch(baseUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Robotaylon/1.0 (+https://robotaylon.dev/agent; verification-checker)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          redirect: 'follow',
          signal: controller.signal
        });

        clearTimeout(timeout);
        if (response.ok) {
          html = await response.text();
          fetchSuccess = true;
        }
      } catch (httpsErr) {
        // Fallback a HTTP
        try {
          const fallbackCtrl = new AbortController();
          const fbTimeout = setTimeout(() => fallbackCtrl.abort(), 6000);
          const fbRes = await fetch(`http://${cleanDomain}`, {
            method: 'GET',
            headers: { 'User-Agent': 'Robotaylon/1.0 (verification-checker)' },
            redirect: 'follow',
            signal: fallbackCtrl.signal
          });
          clearTimeout(fbTimeout);
          if (fbRes.ok) {
            html = await fbRes.text();
            fetchSuccess = true;
          }
        } catch (httpErr) {
          // Fallback también falló
        }
      }

      if (!fetchSuccess) {
        return res.json({
          ok: true,
          verified: false,
          method: 'meta',
          reason: `No se pudo conectar con el servidor en ${cleanDomain}`
        });
      }

      // Buscar la etiqueta meta en el HTML
      const metaPattern1 = /<meta\s+[^>]*name=["']robotaylon-verification["'][^>]*content=["']([^"']+)["']/i;
      const metaPattern2 = /<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']robotaylon-verification["']/i;

      const match = html.match(metaPattern1) || html.match(metaPattern2);

      if (match && match[1]) {
        const foundContent = match[1].trim();
        if (foundContent === cleanToken) {
          return res.json({
            ok: true,
            verified: true,
            method: 'meta',
            message: '¡Etiqueta HTML verificada con éxito!'
          });
        } else {
          return res.json({
            ok: true,
            verified: false,
            method: 'meta',
            reason: `Se encontró la etiqueta pero el token (${foundContent}) no coincide con el token activo (${cleanToken})`
          });
        }
      } else {
        return res.json({
          ok: true,
          verified: false,
          method: 'meta',
          reason: `No se detectó la etiqueta <meta name="robotaylon-verification"> en el <head> de ${cleanDomain}`
        });
      }

    } else {
      // Método 2: Verificar archivo plano robotaylon.txt en la raíz pública
      const fileUrls = [
        `${baseUrl}/robotaylon.txt`,
        `${baseUrl}/.well-known/robotaylon.txt`,
        `http://${cleanDomain}/robotaylon.txt`
      ];

      let foundContent: string | null = null;

      for (const fileUrl of fileUrls) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 4000);
          const fileRes = await fetch(fileUrl, {
            method: 'GET',
            headers: { 'User-Agent': 'Robotaylon/1.0 (verification-checker)' },
            signal: ctrl.signal
          });
          clearTimeout(t);

          if (fileRes.ok) {
            const text = await fileRes.text();
            if (text && text.length < 5000) {
              foundContent = text;
              break;
            }
          }
        } catch (e) {
          // Intentar la siguiente URL
        }
      }

      if (foundContent) {
        const hasToken = foundContent.includes(cleanToken);
        const hasAgent = /robotaylon/i.test(foundContent);

        if (hasToken && hasAgent) {
          return res.json({
            ok: true,
            verified: true,
            method: 'file',
            message: '¡Archivo robotaylon.txt verificado correctamente!'
          });
        } else if (hasToken) {
          return res.json({
            ok: true,
            verified: true,
            method: 'file',
            message: 'Token encontrado en el archivo robotaylon.txt'
          });
        } else {
          return res.json({
            ok: true,
            verified: false,
            method: 'file',
            reason: 'El archivo robotaylon.txt existe pero no contiene el token activo'
          });
        }
      } else {
        return res.json({
          ok: true,
          verified: false,
          method: 'file',
          reason: `No se encontró el archivo robotaylon.txt en la raíz pública de ${cleanDomain}`
        });
      }
    }
  } catch (err: any) {
    return res.json({
      ok: true,
      verified: false,
      method: method,
      reason: err.message || 'Error de conexión durante la verificación'
    });
  }
});


// En desarrollo, montar Vite middleware
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static('dist'));
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Robotaylon server running at http://0.0.0.0:${port}`);
});
