import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webp':'image/webp','.woff2':'font/woff2'};
http.createServer((req,res)=>{
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 const raw=new URL(req.url,'http://localhost').pathname;
 if(raw==='/health'){res.writeHead(200,{'Content-Type':'application/json'});return res.end('{"status":"ok","mode":"isolated-browser-demo"}');}
 let rel;try{rel=decodeURIComponent(raw);}catch{res.writeHead(400);return res.end();}
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
 if(rel.split(/[\\/]/).some(p=>p.startsWith('.'))||rel.startsWith('/api/')){res.writeHead(404);return res.end();}
 let file=path.resolve(root,'.'+rel);if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(404);return res.end();}
 if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){if(path.extname(rel)){res.writeHead(404);return res.end();}file=path.join(root,'index.html');}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':path.extname(file)==='.html'?'no-cache':'public, max-age=3600'});if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.PORT||4320),process.env.HOST||'0.0.0.0',()=>console.log(`KinCircle demo: http://127.0.0.1:${process.env.PORT||4320}`));
