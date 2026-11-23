const slots=['foto-perfil','foto-1','foto-2','foto-3','foto-4','amostra-1','amostra-2','amostra-3','cert-img-1','cert-img-2','cert-img-3'];
const html=__HTML__,assets=__ASSETS__,keyHash='cf83a8042c77ba3111cdc0f46ddb505142f7adfd514148056cf02674b3adf9e3';
const reply=(body,status=200,type='text/plain; charset=utf-8')=>new Response(body,{status,headers:{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
function profileLink(value,domain){
 if(!value)return '';
 const url=new URL(value);
 if(url.protocol!=='https:'||![domain,'www.'+domain].includes(url.hostname)||url.username||url.password||url.pathname==='/')throw Error();
 return url.href;
}
export default {async fetch(req,env){
 const path=new URL(req.url).pathname;
 if(req.method==='GET'){
  if(path==='/')return reply(html,200,'text/html; charset=utf-8');
  if(path.startsWith('/assets/')){
   const name=path.slice(8), types={css:'text/css',js:'text/javascript',pdf:'application/pdf',webp:'image/webp',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png'};
   if(Object.hasOwn(assets,name))return reply(Uint8Array.from(atob(assets[name]),c=>c.charCodeAt(0)),200,types[name.split('.').pop()]);
  }
  if(path==='/galeria'){
   const entries=await Promise.all(slots.map(async key=>[key,(await env.BUCKET.head(key))?.customMetadata?.caption||null]));
   return reply(JSON.stringify(Object.fromEntries(entries)),200,'application/json');
  }
  if(slots.includes(path.slice(1))){
   const file=await env.BUCKET.get(path.slice(1));
   return file?reply(file.body,200,file.customMetadata.type):reply('Arquivo indisponível',404);
  }
  if(path==='/perfil'){const data=await env.BUCKET.get('profile');return reply(data?await data.text():'{}',200,'application/json')}
  if(path==='/curriculo.pdf'){const data=await env.BUCKET.get('cv');return data?reply(data.body,200,'application/pdf'):reply('Currículo indisponível',404)}
 }
 if((path==='/perfil'||slots.includes(path.slice(1)))&&req.method==='POST'){
  const token=(req.headers.get('Authorization')||'').replace(/^Bearer /,'');
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  if(Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('')!==(env.EDITOR_HASH||keyHash))return reply('Acesso de edição inválido.',403);
  if(Number(req.headers.get('content-length'))>9*1024*1024)return reply('Arquivo muito grande.',413);
  const form=await req.formData();
  if(path!=='/perfil'){
   const file=form.get('file'), caption=String(form.get('caption')||'').trim();
   if(!caption||caption.length>120||!file?.size||file.size>8*1024*1024)return reply('Informe um título e um arquivo de até 8 MB.',400);
   const sig=new Uint8Array(await file.slice(0,12).arrayBuffer());
   const ascii=String.fromCharCode(...sig);
   let type='';
   if(path.startsWith('/amostra-')&&ascii.startsWith('%PDF-'))type='application/pdf';
   if(path.startsWith('/foto-') || path.startsWith('/cert-img-')){
    if(sig[0]===255&&sig[1]===216&&sig[2]===255)type='image/jpeg';
    if(ascii.startsWith('\x89PNG\r\n\x1a\n'))type='image/png';
    if(ascii.startsWith('RIFF')&&ascii.slice(8)==='WEBP')type='image/webp';
   }
   if(!type)return reply('Formato incompatível com este espaço.',400);
   await env.BUCKET.put(path.slice(1),await file.arrayBuffer(),{customMetadata:{caption,type}});
   return reply('Salvo');
  }
  let profile;
  try{profile={instagram:profileLink(form.get('instagram'),'instagram.com'),linkedin:profileLink(form.get('linkedin'),'linkedin.com'),certs:String(form.get('certs')||'').split(/\r?\n/).map(v=>v.trim()).filter(Boolean).slice(0,100)}}catch{return reply('Confira os endereços dos perfis no Instagram e LinkedIn.',400)}
  const pdf=form.get('pdf');
  if(pdf&&pdf.size){if(pdf.size>5242880||await pdf.slice(0,5).text()!=='%PDF-')return reply('Selecione um PDF válido de até 5 MB.',400);await env.BUCKET.put('cv',await pdf.arrayBuffer());profile.pdf=true}else{profile.pdf=!!await env.BUCKET.head('cv')}
  await env.BUCKET.put('profile',JSON.stringify(profile));return reply('Salvo');
 }
 return reply('Página indisponível',404)
}};
