function queryParams(req) {
  const host = req.headers?.host || 'localhost';
  const proto = req.headers?.['x-forwarded-proto'] || 'https';
  const url = new URL(req.url || '/', `${proto}://${host}`);
  const out = {};
  for (const [key, value] of url.searchParams.entries()) out[key] = value;
  return out;
}

function eventFromRequest(req) {
  let body = req.body;
  if (body === undefined || body === null) body = '';
  else if (typeof body !== 'string' && !Buffer.isBuffer(body)) body = JSON.stringify(body);
  else if (Buffer.isBuffer(body)) body = body.toString('utf8');

  return {
    httpMethod: req.method || 'GET',
    headers: req.headers || {},
    body,
    queryStringParameters: queryParams(req),
    isBase64Encoded: false
  };
}

export function createVercelHandler(netlifyHandler) {
  return async function vercelHandler(req, res) {
    try {
      const result = await netlifyHandler(eventFromRequest(req));
      const headers = result?.headers || {};
      for (const [key, value] of Object.entries(headers)) {
        if (value !== undefined && value !== null) res.setHeader(key, value);
      }

      const status = Number(result?.statusCode || 200);
      res.status(status);

      if (result?.isBase64Encoded) {
        return res.send(Buffer.from(String(result.body || ''), 'base64'));
      }

      return res.send(result?.body ?? '');
    } catch (error) {
      console.error('Vercel function adapter error:', error?.stack || error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'FUNCTION_ERROR',
          message: 'Internal server error.'
        }
      });
    }
  };
}
