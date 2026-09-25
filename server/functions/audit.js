import {googleJson,response,fail} from './_google.js';
import {readSession} from './_session.js';
export async function handler(event){
 const user=readSession(event.headers?.cookie||event.headers?.Cookie); if(!user)return fail(401,'UNAUTHENTICATED','Sign in required.');
 if(!['admin','owner'].includes(user.role))return fail(403,'FORBIDDEN','Audit log access required.');
 try{
  const id=process.env.GOOGLE_SHEET_ID, range=encodeURIComponent('audit_logs!A:ZZ');
  const x=await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}`); const rows=x.values||[];
  const headers=rows[0]||[]; const data=rows.slice(1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??'']))).reverse();
  return response(200,{success:true,data:data.slice(0,500)},{'Cache-Control':'no-store'});
 }catch(e){return fail(500,'AUDIT_ERROR','Unable to read audit logs.');}
}
