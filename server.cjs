// Zero-dependency local preview server. Binds to a FREE port so another old
// portfolio process on :5173 cannot hijack the browser tab.
const http=require('http'),fs=require('fs'),path=require('path');
const {exec}=require('child_process');
const root=__dirname;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.gif':'image/gif','.mp4':'video/mp4','.webm':'video/webm','.pdf':'application/pdf','.ico':'image/x-icon','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 try{
 const uri=decodeURIComponent((req.url||'/').split('?')[0]),url=uri==='/'?'/index.html':uri;
 const file=path.resolve(root,'.'+url);
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end('Forbidden');return}
 fs.stat(file,(err,stat)=>{
   if(err||!stat.isFile()){res.writeHead(404).end('Not found');return}
   let start=0,end=stat.size-1,status=200;const range=req.headers.range;
   if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);
     if(m){start=m[1]?Number(m[1]):0;end=m[2]?Math.min(Number(m[2]),end):end;status=206}
     if(start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return}
   }
   const headers={'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','Accept-Ranges':'bytes','Content-Length':end-start+1,'Cache-Control':'no-store'};
   if(status===206)headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
   res.writeHead(status,headers);
   fs.createReadStream(file,{start,end}).pipe(res);
 });
 }catch(e){res.writeHead(400).end('Bad request')}
});
server.on('error',e=>{console.error('Local preview could not start:',e.message);process.exitCode=1});
server.listen(0,'127.0.0.1',()=>{
 const port=server.address().port,url=`http://127.0.0.1:${port}/`;
 console.log('\n========================================');
 console.log('KALYANA LIQUID PORTFOLIO v3 — LOCAL SERVER');
 console.log('========================================');
 console.log('Open this exact URL: '+url);
 console.log('3D demolition demo: '+url+'demo-original.html');
 console.log('Press Ctrl+C to stop the server.\n');
 if(process.argv.includes('--open')){
   setTimeout(()=>{
     if(process.platform==='win32')exec(`start "" "${url}"`);
     else if(process.platform==='darwin')exec(`open "${url}"`);
     else exec(`xdg-open "${url}"`);
   },600);
 }
});
