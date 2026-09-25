import crypto from 'node:crypto';
import { googleJson, response, fail } from './_google.js';

const SHEET = 'users';

// 30-minute session.
// The frontend sends a heartbeat only while the user is active.
// The GET /auth endpoint refreshes this expiration.
const SESSION_MAX_AGE = 30 * 60 * 1000;
const SESSION_MAX_AGE_SECONDS = 30 * 60;

const b64 = value =>
  Buffer.from(value).toString('base64url');

const secret = () => {
  const value = process.env.SESSION_SECRET || '';

  if (!value) {
    throw new Error('Missing environment variable: SESSION_SECRET');
  }

  return value;
};


// ============================================================
// PASSWORD HASHING
// ============================================================

function hashPassword(
  password,
  salt = crypto.randomBytes(16).toString('hex')
) {
  const hash = crypto
    .pbkdf2Sync(
      password,
      salt,
      120000,
      32,
      'sha256'
    )
    .toString('hex');

  return `${salt}:${hash}`;
}


function verifyPassword(password, stored) {
  const parts = String(stored || '').split(':');

  if (parts.length !== 2) {
    return false;
  }

  const [salt, storedHash] = parts;

  if (!salt || !storedHash) {
    return false;
  }

  try {
    const actualHash = crypto
      .pbkdf2Sync(
        password,
        salt,
        120000,
        32,
        'sha256'
      )
      .toString('hex');

    const actual = Buffer.from(actualHash, 'utf8');
    const expected = Buffer.from(storedHash, 'utf8');

    if (actual.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(actual, expected);
  } catch (error) {
    console.error(
      'Password verification error:',
      error?.stack || error
    );

    return false;
  }
}


// ============================================================
// SESSION
// ============================================================

function createSession(user) {
  const payload = b64(
    JSON.stringify({
      sub: user.username,
      role: user.role,
      displayName: user.displayName || user.username,

      // Sliding session expiry.
      // /auth GET refreshes this while the user is active.
      exp: Date.now() + SESSION_MAX_AGE
    })
  );

  const signature = crypto
    .createHmac('sha256', secret())
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}


function verifySession(value) {
  if (!value) {
    return null;
  }

  try {
    const [payload, signature] = String(value).split('.');

    if (!payload || !signature) {
      return null;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret())
      .update(payload)
      .digest('base64url');

    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSignature);

    if (
      a.length !== b.length ||
      !crypto.timingSafeEqual(a, b)
    ) {
      return null;
    }

    const data = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    );

    if (!data.exp || data.exp <= Date.now()) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}


function sessionCookie(value) {
  return [
    `collabor8_session=${value}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`
  ].join('; ');
}


// ============================================================
// GOOGLE SHEETS USERS
// ============================================================

async function readUsers() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEET_ID');
  }

  const range = encodeURIComponent(`${SHEET}!A:ZZ`);

  const result = await googleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`
  );

  const rows = result.values || [];

  if (!rows.length) {
    return [];
  }

  const headers = rows[0];

  return rows.slice(1).map(row => {
    const user = {};

    headers.forEach((header, index) => {
      user[header] = row[index] ?? '';
    });

    return user;
  });
}


async function writeUsers(users) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEET_ID');
  }

  const headers = [
    'id',
    'username',
    'displayName',
    'role',
    'passwordHash',
    'active',
    'createdAt',
    'updatedAt'
  ];

  const values = [
    headers,
    ...users.map(user =>
      headers.map(header => user[header] ?? '')
    )
  ];

  const lastRow = Math.max(values.length, 1);

  const range = encodeURIComponent(
    `${SHEET}!A1:H${lastRow}`
  );

  await googleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        majorDimension: 'ROWS',
        values
      })
    }
  );
}


// ============================================================
// VERCEL ENVIRONMENT ACCOUNTS
// ============================================================

function environmentAccounts() {
  const accounts = [];

  for (const role of ['admin', 'staff']) {
    const username =
      process.env[
        `COLLABOR8_${role.toUpperCase()}_USERNAME`
      ];

    const password =
      process.env[
        `COLLABOR8_${role.toUpperCase()}_PASSWORD`
      ];

    if (username && password) {
      accounts.push({
        username,
        password,
        role,
        displayName:
          role === 'admin'
            ? 'Administrator'
            : 'Staff'
      });
    }
  }

  return accounts;
}


// ============================================================
// BEST-EFFORT SHEETS SYNC
// ============================================================

async function persistEnvironmentUser(user) {
  try {
    let users = [];

    try {
      users = await readUsers();
    } catch (error) {
      console.error(
        'Could not read users sheet:',
        error?.stack || error
      );

      return;
    }

    const now = new Date().toISOString();

    const existingIndex = users.findIndex(
      item =>
        String(item.username || '').toLowerCase() ===
        String(user.username || '').toLowerCase()
    );

    const savedUser = {
      id:
        existingIndex >= 0
          ? users[existingIndex].id
          : user.role === 'admin'
            ? 'USR-00001'
            : 'USR-00002',

      username: user.username,
      displayName: user.displayName,
      role: user.role,
      passwordHash: hashPassword(user.password),
      active: 'true',

      createdAt:
        existingIndex >= 0
          ? users[existingIndex].createdAt || now
          : now,

      updatedAt: now
    };

    if (existingIndex >= 0) {
      users[existingIndex] = savedUser;
    } else {
      users.push(savedUser);
    }

    await writeUsers(users);

  } catch (error) {
    // IMPORTANT:
    // Google Sheets failure must NOT prevent the user from logging in.
    console.error(
      'Could not persist environment user:',
      error?.stack || error
    );
  }
}


// ============================================================
// REQUEST HELPERS
// ============================================================

function getCookie(event, name) {
  const cookieHeader =
    event.headers?.cookie ||
    event.headers?.Cookie ||
    '';

  const match = String(cookieHeader).match(
    new RegExp(
      `(?:^|;\\s*)${name}=([^;]+)`
    )
  );

  return match ? match[1] : null;
}


// ============================================================
// MAIN HANDLER
// ============================================================

export async function handler(event) {
  try {

    // ========================================================
    // GET /auth
    //
    // Checks current session.
    // If valid, refreshes the session for another 30 minutes.
    // ========================================================

    if (event.httpMethod === 'GET') {

      const cookie = getCookie(
        event,
        'collabor8_session'
      );

      if (!cookie) {
        return fail(
          401,
          'UNAUTHENTICATED',
          'Sign in required.'
        );
      }

      const session = verifySession(cookie);

      if (!session) {
        return fail(
          401,
          'SESSION_EXPIRED',
          'Your session has expired. Please sign in again.'
        );
      }

      const refreshedUser = {
        username: session.sub,
        role: session.role,
        displayName:
          session.displayName || session.sub
      };

      const refreshedSession =
        createSession(refreshedUser);

      return response(
        200,
        {
          success: true,
          user: refreshedUser
        },
        {
          'Set-Cookie':
            sessionCookie(refreshedSession),

          'Cache-Control':
            'no-store, no-cache, must-revalidate, private'
        }
      );
    }


    // ========================================================
    // POST /auth
    //
    // Login.
    // ========================================================

    if (event.httpMethod !== 'POST') {
      return fail(
        405,
        'METHOD_NOT_ALLOWED',
        'POST required.'
      );
    }


    let body = {};

    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return fail(
        400,
        'INVALID_JSON',
        'Invalid login request.'
      );
    }


    const username =
      String(body.username || '').trim();

    const password =
      String(body.password || '');


    if (!username || !password) {
      return fail(
        400,
        'VALIDATION_ERROR',
        'Username and password are required.'
      );
    }


    // ========================================================
    // 1. VERCEL ENVIRONMENT ACCOUNT
    //
    // These accounts are authoritative.
    // ========================================================

    const envAccounts =
      environmentAccounts();

    const envUser =
      envAccounts.find(
        account =>
          String(account.username).toLowerCase() ===
          username.toLowerCase()
      );


    if (envUser) {

      if (password !== envUser.password) {
        return fail(
          401,
          'INVALID_CREDENTIALS',
          'Invalid username or password.'
        );
      }


      const user = {
        username: envUser.username,
        role: envUser.role,
        displayName: envUser.displayName,
        active: 'true',
        password: envUser.password
      };


      // Save/update the account in Google Sheets,
      // but do not block login if Google Sheets is unavailable.
      await persistEnvironmentUser(user);


      const session =
        createSession(user);


      return response(
        200,
        {
          success: true,
          username: user.username,
          role: user.role,
          displayName: user.displayName
        },
        {
          'Set-Cookie':
            sessionCookie(session),

          'Cache-Control':
            'no-store, no-cache, must-revalidate, private'
        }
      );
    }


    // ========================================================
    // 2. GOOGLE SHEETS USER
    //
    // Used for users created through User Management.
    // ========================================================

    let users = [];

    try {
      users = await readUsers();
    } catch (error) {

      console.error(
        'Could not read users:',
        error?.stack || error
      );

      return fail(
        503,
        'USER_STORE_UNAVAILABLE',
        'User authentication service is temporarily unavailable.'
      );
    }


    const user =
      users.find(
        item =>
          String(item.username || '').toLowerCase() ===
          username.toLowerCase() &&
          String(item.active || '').toLowerCase() !== 'false'
      );


    if (!user) {
      return fail(
        401,
        'INVALID_CREDENTIALS',
        'Invalid username or password.'
      );
    }


    if (
      !verifyPassword(
        password,
        user.passwordHash
      )
    ) {
      return fail(
        401,
        'INVALID_CREDENTIALS',
        'Invalid username or password.'
      );
    }


    const sessionUser = {
      username: user.username,
      role: user.role,
      displayName:
        user.displayName || user.username
    };


    const session =
      createSession(sessionUser);


    return response(
      200,
      {
        success: true,
        username: sessionUser.username,
        role: sessionUser.role,
        displayName: sessionUser.displayName
      },
      {
        'Set-Cookie':
          sessionCookie(session),

        'Cache-Control':
          'no-store, no-cache, must-revalidate, private'
      }
    );

  } catch (error) {

    console.error(
      'AUTH ERROR:',
      error?.stack || error
    );

    return fail(
      500,
      'AUTH_ERROR',
      'Authentication service unavailable.'
    );
  }
}
