export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'GET required.' } });
  }
  return res.status(200).json({ success: true, service: 'collabor8', platform: 'vercel', timestamp: new Date().toISOString() });
}
