import crypto from 'node:crypto';
const secret=()=>process.env.SESSION_SECRET||'';
export function readSession(h){const m=String(h||'').match(/(?:^|;\s*)collabor8_session=([^;]+)/);if(!m)return null;const [p,s]=m[1].split('.');if(!p||!s)return null;const e=crypto.createHmac('sha256',secret()).update(p).digest('base64url');if(s!==e)return null;try{const x=JSON.parse(Buffer.from(p,'base64url'));return x.exp>Date.now()?{username:x.sub,role:x.role}:null}catch{return null}}
export function isOwner(user){return user?.role==='owner';}
