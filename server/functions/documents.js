import {googleJson,response,fail,serviceAccountToken} from './_google.js';
import {readSession, isOwner} from './_session.js';

const MAX=5*1024*1024;
const TYPES=new Set(['application/pdf','image/jpeg','image/png']);
const DRIVE='https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD='https://www.googleapis.com/upload/drive/v3/files';

function auth(e){return readSession(e.headers?.cookie||e.headers?.Cookie)}
function parse(e){try{return JSON.parse(e.body||'{}')}catch{return null}}

async function uploadDrive(name,mime,bytes,folder){
  const boundary='collabor8_'+Date.now();
  const meta={name,mimeType:mime}; if(folder) meta.parents=[folder];
  const head=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`;
  const tail=`\r\n--${boundary}--`;
  const body=Buffer.concat([Buffer.from(head),bytes,Buffer.from(tail)]);
  return googleJson(`${DRIVE_UPLOAD}?uploadType=multipart&fields=id,name,mimeType,size,webViewLink`,{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body});
}

async function audit(user,action,entity,id,oldValue='',newValue=''){
  const sid=process.env.GOOGLE_SHEET_ID;
  const range=encodeURIComponent('audit_logs!A:ZZ');
  const x=await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${range}`); const rows=x.values||[];
  const headers=rows[0]||['ID','Timestamp','User ID','Username','Action','Entity','Entity ID','Old Value','New Value'];
  const data=rows.slice(1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
  data.push({ID:`AUD-${String(data.length+1).padStart(5,'0')}`,Timestamp:new Date().toISOString(),'User ID':user.username||'','Username':user.username||'',Action:action,Entity:entity,'Entity ID':id||'','Old Value':oldValue,'New Value':newValue});
  const values=[headers,...data.map(r=>headers.map(h=>r[h]??''))];
  await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${range}:clear`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${range}?valueInputOption=USER_ENTERED`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({majorDimension:'ROWS',values})});
}

async function initiateResumableUpload(name,mime,size,folder){
  const token=await serviceAccountToken('https://www.googleapis.com/auth/drive');
  const metadata={name,mimeType:mime}; if(folder) metadata.parents=[folder];
  const r=await fetch(`${DRIVE_UPLOAD}?uploadType=resumable`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':mime,'X-Upload-Content-Length':String(size)},body:JSON.stringify(metadata)});
  if(!r.ok) throw new Error((await r.text().catch(()=>''))||`Drive upload session failed (${r.status})`);
  const location=r.headers.get('location');
  if(!location) throw new Error('Google Drive did not return an upload session URL.');
  return location;
}

async function recordDriveDocument(user,b){
  if(!b.googleDriveFileId)return fail(400,'VALIDATION_ERROR','Google Drive file id is required.');
  const meta=await googleJson(`${DRIVE}/files/${encodeURIComponent(b.googleDriveFileId)}?fields=id,name,mimeType,size,webViewLink`);
  const size=Number(meta.size||0);
  const mime=String(meta.mimeType||b.mime||'');
  if(size>MAX)return fail(400,'FILE_TOO_LARGE','Maximum file size is 5 MB.');
  if(!TYPES.has(mime))return fail(400,'INVALID_FILE_TYPE','Only PDF, JPG and PNG files are allowed.');

  const now=new Date().toISOString();
  const doc={id:`DOC-${Date.now()}`,occupantId:b.occupantId||'',documentType:b.documentType||'Other',fileName:meta.name||b.name||'document',googleDriveFileId:meta.id,googleDriveUrl:meta.webViewLink||`https://drive.google.com/open?id=${meta.id}`,uploadedBy:user.username||'',uploadedAt:now,status:'ACTIVE',mime,size,notes:b.notes||''};
  const sheetId=process.env.GOOGLE_SHEET_ID, range=encodeURIComponent('documents!A:ZZ');
  const x=await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`); const rows=x.values||[];
  const headers=rows[0]||Object.keys(doc); const old=rows.slice(1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
  const merged=[...old,doc]; const allHeaders=[...new Set(merged.flatMap(Object.keys))]; const values=[allHeaders,...merged.map(r=>allHeaders.map(h=>r[h]??''))];
  await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:clear`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({majorDimension:'ROWS',values})});
  await audit(user,'Document Upload','Document',doc.id,'',JSON.stringify({fileName:doc.fileName,occupantId:doc.occupantId,googleDriveFileId:doc.googleDriveFileId}));
  return response(200,{success:true,data:doc});
}

export async function handler(event){
 const user=auth(event); if(!user)return fail(401,'UNAUTHENTICATED','Sign in required.');
 try{
  if(event.httpMethod==='GET'){
   const id=event.queryStringParameters?.id, action=event.queryStringParameters?.action||'list';
   if(action==='download'&&id){
     const meta=await googleJson(`${DRIVE}/files/${encodeURIComponent(id)}?fields=name,mimeType,size`);
     if(Number(meta.size||0)>MAX)return fail(400,'FILE_TOO_LARGE','File exceeds 5 MB limit.');
     const t=await serviceAccountToken('https://www.googleapis.com/auth/drive');
     const r=await fetch(`${DRIVE}/files/${encodeURIComponent(id)}?alt=media`,{headers:{Authorization:`Bearer ${t}`}});
     if(!r.ok)return fail(r.status,'DRIVE_DOWNLOAD_FAILED','Unable to download document.');
     const buf=Buffer.from(await r.arrayBuffer());
     return {statusCode:200,isBase64Encoded:true,headers:{'Content-Type':meta.mimeType||'application/octet-stream','Content-Disposition':`inline; filename="${String(meta.name||'document').replace(/"/g,'') }"`,'Cache-Control':'private, max-age=300'},body:buf.toString('base64')};
   }
   return response(400,{success:false,error:{code:'VALIDATION_ERROR',message:'Document id required.'}});
  }
  if(event.httpMethod!=='POST')return fail(405,'METHOD_NOT_ALLOWED','POST required.');
  if(isOwner(user))return fail(403,'FORBIDDEN','Owner accounts are read-only.');
  const b=parse(event)||{};

  if(b.action==='initiateUpload'){
    if(!b.name||!b.mime||!Number.isFinite(Number(b.size)))return fail(400,'VALIDATION_ERROR','File name, type and size are required.');
    const size=Number(b.size); if(size<=0)return fail(400,'VALIDATION_ERROR','File is empty.'); if(size>MAX)return fail(400,'FILE_TOO_LARGE','Maximum file size is 5 MB.'); if(!TYPES.has(b.mime))return fail(400,'INVALID_FILE_TYPE','Only PDF, JPG and PNG files are allowed.');
    const sessionUrl=await initiateResumableUpload(String(b.name),String(b.mime),size,process.env.GOOGLE_DRIVE_FOLDER_ID);
    return response(200,{success:true,sessionUrl});
  }

  if(b.action==='finalizeUpload')return await recordDriveDocument(user,b);

  if(b.action==='delete'){
    if(!b.id)return fail(400,'VALIDATION_ERROR','Document id required.');
    const sid=process.env.GOOGLE_SHEET_ID, range=encodeURIComponent('documents!A:ZZ');
    const x=await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${range}`); const rows=x.values||[]; const headers=rows[0]||[];
    const current=rows.slice(1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??'']))); const target=current.find(r=>(r.id||r.ID)===b.id);
    if(!target)return fail(404,'NOT_FOUND','Document not found.');
    if(target.googleDriveFileId){ const t=await serviceAccountToken('https://www.googleapis.com/auth/drive'); const dr=await fetch(`${DRIVE}/files/${encodeURIComponent(target.googleDriveFileId)}`,{method:'DELETE',headers:{Authorization:`Bearer ${t}`}}); if(!dr.ok && dr.status!==404)return fail(500,'DRIVE_DELETE_FAILED','Unable to delete file from Google Drive.'); }
    const kept=current.filter(r=>(r.id||r.ID)!==b.id); const values=headers.length?[headers,...kept.map(r=>headers.map(h=>r[h]??''))]:[];
    await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${range}:clear`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    if(values.length)await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${range}?valueInputOption=USER_ENTERED`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({majorDimension:'ROWS',values})});
    await audit(user,'Delete','Document',b.id,JSON.stringify({fileName:target.fileName||target.name}),'' );
    return response(200,{success:true});
  }

  if(b.action!=='upload')return fail(400,'VALIDATION_ERROR','Upload action required.');
  const bytes=Buffer.from(b.dataBase64||'','base64');
  if(!b.name||!b.mime||!bytes.length)return fail(400,'VALIDATION_ERROR','File name, type and content are required.');
  if(bytes.length>MAX)return fail(400,'FILE_TOO_LARGE','Maximum file size is 5 MB.');
  if(!TYPES.has(b.mime))return fail(400,'INVALID_FILE_TYPE','Only PDF, JPG and PNG files are allowed.');
  const f=await uploadDrive(b.name,b.mime,bytes,process.env.GOOGLE_DRIVE_FOLDER_ID);
  return await recordDriveDocument(user,{...b,googleDriveFileId:f.id});
 }catch(e){console.error(e);return fail(500,'DOCUMENT_ERROR','Unable to process document.');}
}
