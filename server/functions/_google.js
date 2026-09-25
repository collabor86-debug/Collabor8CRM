import crypto from 'node:crypto';

const env = (name) => {
  if (!process.env[name]) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return process.env[name];
};

const b64 = (value) =>
  Buffer.from(value).toString('base64url');

export async function serviceAccountToken(scope) {
  const now = Math.floor(Date.now() / 1000);

  const header = b64(
    JSON.stringify({
      alg: 'RS256',
      typ: 'JWT'
    })
  );

  const claim = b64(
    JSON.stringify({
      iss: env('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
      scope,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    })
  );

  const unsigned = `${header}.${claim}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();

  const privateKey = env('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');

  const signature = signer
    .sign(privateKey)
    .toString('base64url');

  const assertion = `${unsigned}.${signature}`;

  const response = await fetch(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type:
          'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error_description || 'Token request failed'
    );
  }

  return data.access_token;
}

export async function googleJson(url, options = {}) {
  const token = await serviceAccountToken(
    'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive'
  );

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error?.message || `Google API ${response.status}`
    );
  }

  return data;
}

export function response(status, body, headers = {}) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  };
}

export function fail(status, code, message) {
  return response(status, {
    success: false,
    error: {
      code,
      message
    }
  });
}