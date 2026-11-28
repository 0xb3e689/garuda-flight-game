// Local offline static server for Garuda (Node 22, stdlib only). Usage: node serve.ts [--port 8080]
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=resolve(fileURLToPath(new URL('./game',import.meta.url)));
const MIME:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.wav':'audio/wav','.txt':'text/plain; charset=utf-8'};
const idx=process.argv.indexOf('--port'),pNum=idx>=0?Number(process.argv[idx+1]):8080;
const port=Number.isInteger(pNum)&&pNum>0&&pNum<65536?pNum:8080;
createServer((req,res)=>{
  let p:string;try{p=decodeURIComponent(new URL(req.url??'/','http://localhost').pathname);}catch{res.writeHead(400).end('Bad request');return;}
  if(p.endsWith('/'))p+='index.html';
  const t=resolve(join(ROOT,normalize(p)));
  if(t!==ROOT&&!t.startsWith(ROOT+sep)){res.writeHead(403).end('Forbidden');return;}
  try{
    const st=statSync(t);if(!st.isFile())throw 0;
    res.writeHead(200,{'content-type':MIME[extname(t).toLowerCase()]??'application/octet-stream','content-length':st.size,'cache-control':'no-store'});
    createReadStream(t).pipe(res);
  }catch{res.writeHead(404).end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Garuda running at http://127.0.0.1:${port}`));
