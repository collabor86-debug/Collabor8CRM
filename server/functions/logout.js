export async function handler(event) {

  if (
    event.httpMethod !== 'POST' &&
    event.httpMethod !== 'GET'
  ) {
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
