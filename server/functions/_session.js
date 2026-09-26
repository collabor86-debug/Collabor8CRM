import crypto from 'node:crypto';
const ALLOWED_ROLES=new Set(['admin','staff','owner']);
const secret=()=>{
 const value=process.env.SESSION_SECRET||'';
 if(!value) throw new Error('Missing SESSION_SECRET');
 return value;
};
export function requestOriginAllowed(event){
 const origin=event?.headers?.origin||event?.headers?.Origin;
 if(!origin) return true;
 const host=event?.headers?.host||event?.headers?.Host;
 const proto=event?.headers?.['x-forwarded-proto']||event?.headers?.['X-Forwarded-Proto']||'https';
 if(!host) return false;
 try{return new URL(origin).origin===new URL(`${proto}://${host}`).origin}catch{return false}
}
export function readSession(h){
 const m=String(h||'').match(/(?:^|;\s*)collabor8_session=([^;]+)/);
 if(!m)return null;
 const [p,s]=m[1].split('.');
 if(!p||!s)return null;
 try{
  const e=crypto.createHmac('sha256',secret()).update(p).digest('base64url');
  const a=Buffer.from(s),b=Buffer.from(e);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
  const x=JSON.parse(Buffer.from(p,'base64url').toString('utf8'));
  if(!x?.sub||!ALLOWED_ROLES.has(x.role)||!Number.isFinite(x.exp)||x.exp<=Date.now())return null;
  return {username:String(x.sub),role:x.role,displayName:x.displayName||String(x.sub)};
 }catch{return null}
}
export function isOwner(user){return user?.role==='owner';}
