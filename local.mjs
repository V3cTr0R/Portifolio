// Local preview with a file-backed implementation of the storage interface.
import http from 'node:http';
import path from 'node:path';
import {mkdir, readFile, writeFile, rename} from 'node:fs/promises';
import {randomBytes, createHash, randomUUID} from 'node:crypto';
import worker from './dist/server/index.js';
const dir = new URL('./.local-data/', import.meta.url);
await mkdir(dir, {recursive:true,mode:0o700});
const keyFile = new URL('editor.key',dir);
try {await writeFile(keyFile,randomBytes(32).toString('hex'),{flag:'wx',mode:0o600});}
catch (err) {if(err.code!=='EEXIST')throw err;}
const key=(await readFile(keyFile,'utf8')).trim();
const filePath=name=>new URL(path.basename(name)+'.json',dir);
const bucket={
  async get(name){
    let record;
    try {record=JSON.parse(await readFile(filePath(name),'utf8'));}
    catch(err){if(err.code==='ENOENT')return null; throw err;}
    const body=Buffer.from(record.data,'base64');
    return {body,customMetadata:record.meta,text:async()=>body.toString()};
  },
  async head(name){return this.get(name);},
  async put(name,value,options={}){
    const data=Buffer.from(value).toString('base64');
    const tmp=new URL(randomUUID()+'.tmp',dir);
    await writeFile(tmp,JSON.stringify({data,meta:options.customMetadata}),{mode:0o600});
    await rename(tmp,filePath(name));
  }
};
const portIndex=process.argv.indexOf('--port');
const port=Number(portIndex>=0 ? process.argv[portIndex+1] : process.env.PORT||3000);
const host=process.env.HOST||'127.0.0.1';
const server=http.createServer(async(req,res)=>{
  try{
    const init={method:req.method,headers:req.headers};
    if(req.method==='POST'){init.body=req;init.duplex='half';}
    const out=await worker.fetch(new Request(new URL(req.url,'http://localhost'),init),{
      BUCKET:bucket, EDITOR_HASH:createHash('sha256').update(key).digest('hex')
    });
    res.writeHead(out.status,Object.fromEntries(out.headers));
    res.end(Buffer.from(await out.arrayBuffer()));
  }catch{res.writeHead(500);res.end('Erro ao atender a solicitação.');}
});
server.listen(port,host,()=>console.log('Portfólio em http://'+host+':'+port+' · chave de edição em .local-data/editor.key'));
