import {response,fail} from './_google.js';
import {readSession, isOwner, requestOriginAllowed} from './_session.js';
const auth=e=>readSession(e.headers?.cookie||e.headers?.Cookie);
const env=n=>process.env[n]||'';
function body(e){try{return JSON.parse(e.body||'{}')}catch{return null}}
export async function handler(event){
 const user=auth(event);if(!user)return fail(401,'UNAUTHENTICATED','Sign in required.');if(event.httpMethod!=='GET'&&!requestOriginAllowed(event))return fail(403,'FORBIDDEN','Cross-origin request blocked.');
 if(isOwner(user))return fail(403,'FORBIDDEN','Owner accounts are read-only.');
 if(event.httpMethod!=='POST')return fail(405,'METHOD_NOT_ALLOWED','POST required.');
 const b=body(event)||{};const channel=b.channel;
 if(!['email','whatsapp'].includes(channel))return fail(400,'VALIDATION_ERROR','Unsupported channel.');
 if(channel==='email'){
  if(!env('RESEND_API_KEY'))return fail(503,'NOT_CONFIGURED','Email integration is not configured.');
  if(!b.to||!b.subject||!b.html)return fail(400,'VALIDATION_ERROR','to, subject and html are required.');
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env('RESEND_API_KEY')}`,'Content-Type':'application/json'},body:JSON.stringify({from:env('RESEND_FROM')||'COLLABOR8 <onboarding@resend.dev>',to:[b.to],subject:b.subject,html:b.html})});
  const j=await r.json().catch(()=>({}));if(!r.ok)return fail(502,'EMAIL_PROVIDER_ERROR',j.message||'Email provider failed.');return response(200,{success:true,id:j.id||null});
 }
 if(!env('TWILIO_ACCOUNT_SID')||!env('TWILIO_AUTH_TOKEN')||!env('TWILIO_WHATSAPP_FROM'))return fail(503,'NOT_CONFIGURED','WhatsApp integration is not configured.');
 if(!b.to||!b.body)return fail(400,'VALIDATION_ERROR','to and body are required.');
 const token=Buffer.from(`${env('TWILIO_ACCOUNT_SID')}:${env('TWILIO_AUTH_TOKEN')}`).toString('base64');
 const params=new URLSearchParams({From:env('TWILIO_WHATSAPP_FROM'),To:`whatsapp:${b.to.replace(/^whatsapp:/,'')}`,Body:b.body});
 const r=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env('TWILIO_ACCOUNT_SID')}/Messages.json`,{method:'POST',headers:{Authorization:`Basic ${token}`,'Content-Type':'application/x-www-form-urlencoded'},body:params});
 const j=await r.json().catch(()=>({}));if(!r.ok)return fail(502,'WHATSAPP_PROVIDER_ERROR',j.message||'WhatsApp provider failed.');return response(200,{success:true,id:j.sid||null});
}
