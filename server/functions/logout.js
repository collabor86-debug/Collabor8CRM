export async function handler(event) {

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'POST required.'
        }
      })
    };
  }


  const origin = event.headers?.origin || event.headers?.Origin;
  const host = event.headers?.host || event.headers?.Host;
  const proto = event.headers?.['x-forwarded-proto'] || event.headers?.['X-Forwarded-Proto'] || 'https';
  if (origin && host) { try { if (new URL(origin).origin !== new URL(`${proto}://${host}`).origin) return { statusCode: 403, headers: {'Content-Type':'application/json'}, body: JSON.stringify({success:false,error:{code:'FORBIDDEN',message:'Cross-origin request blocked.'}}) }; } catch { return { statusCode: 403, headers: {'Content-Type':'application/json'}, body: JSON.stringify({success:false,error:{code:'FORBIDDEN',message:'Invalid request origin.'}}) }; } }

  // Immediately invalidate the browser's session cookie.
  //
  // Max-Age=0 removes it now.
  // Expires=Thu, 01 Jan 1970 also handles older browsers.
  const expiredCookie = [
    'collabor8_session=',
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ].join('; ');


  return {
    statusCode: 200,

    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': expiredCookie,
      'Cache-Control':
        'no-store, no-cache, must-revalidate, private'
    },

    body: JSON.stringify({
      success: true
    })
  };
}
