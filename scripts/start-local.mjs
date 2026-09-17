import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { emitKeypressEvents } from 'node:readline';
const root=fileURLToPath(new URL('../',import.meta.url));
const apiRoot=root+'apps/api/';
const dataPath=root+'.local-data/postgres';
const children=[];
let pg,socket,stopping=false;
let ownerLoginPassword=process.env.OWNER_PASSWORD;
async function passwordPrompt(){
  if(process.env.OWNER_PASSWORD) return process.env.OWNER_PASSWORD;
  if(!process.stdin.isTTY) throw new Error('First run needs OWNER_PASSWORD in the environment or an interactive terminal.');
  process.stdout.write('Password for Aravind: ');
  emitKeypressEvents(process.stdin);process.stdin.setRawMode(true);process.stdin.resume();
  return new Promise((resolve,reject)=>{
    let value='';
    const cleanup=()=>{process.stdin.off('keypress',key);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');};
    const key=(text,k)=>{
      if(k?.ctrl&&k.name==='c'){cleanup();reject(new Error('Cancelled'));}
      else if(k?.name==='return'){cleanup();resolve(value);}
      else if(k?.name==='backspace'){if(value){value=value.slice(0,-1);process.stdout.write('\b \b');}}
      else if(text&&!k?.ctrl&&!k?.meta){value+=text;process.stdout.write('*'.repeat(text.length));}
    };process.stdin.on('keypress',key);
  });
}
async function ensurePort(port){
  await new Promise((resolve,reject)=>{const server=createServer();server.once('error',()=>reject(new Error(`Port ${port} is already in use. Stop the existing application first.`)));server.listen(port,'127.0.0.1',()=>server.close(resolve));});
}
function launch(args,cwd,env){
  const child=spawn(process.execPath,args,{cwd,env,stdio:'inherit'});children.push(child);
  child.on('error',error=>{console.error(error.message);void stop(1);});
  return child;
}
async function stop(code=0){
  if(stopping)return;stopping=true;
  for(const child of children){if(child.exitCode===null&&!child.killed){child.kill('SIGTERM');await new Promise(resolve=>{child.once('exit',resolve);setTimeout(resolve,3000).unref();});}}
  if(socket)await socket.stop();
  await new Promise(resolve=>setImmediate(()=>setImmediate(resolve)));
  if(pg)await pg.close();
  process.exitCode=code;
}
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
try{
  await ensurePort(3001);await ensurePort(4173);
  await mkdir(dataPath,{recursive:true});
  pg=await PGlite.create(dataPath);
  await pg.exec('CREATE TABLE IF NOT EXISTS "_LocalMigration" (name TEXT PRIMARY KEY)');
  for(const dir of (await readdir(apiRoot+'prisma/migrations')).filter(x=>/^\d/.test(x)).sort()){
    if((await pg.query('SELECT name FROM "_LocalMigration" WHERE name=$1',[dir])).rows.length)continue;
    const sql=await readFile(apiRoot+`prisma/migrations/${dir}/migration.sql`,'utf8');
    await pg.transaction(async tx=>{await tx.exec(sql);await tx.query('INSERT INTO "_LocalMigration" (name) VALUES ($1)',[dir]);});
  }
  socket=new PGLiteSocketServer({db:pg,port:0,host:'127.0.0.1',maxConnections:1});await socket.start();
  const env={...process.env,DATABASE_URL:'postgresql://postgres:postgres@'+socket.getServerConn()+'/postgres?connection_limit=1&pool_timeout=20',JWT_SECRET:randomBytes(48).toString('hex'),CRON_SECRET:randomBytes(32).toString('hex'),APP_ENV:'training',NODE_ENV:'development',WEB_ORIGIN:'http://localhost:4173',PUBLIC_ORIGIN:'http://localhost:4173',PORT:'3001'};
  delete env.OWNER_PASSWORD;
  const seeded=(await pg.query('SELECT value FROM "Setting" WHERE key=$1',['sampleDatasetVersion'])).rows.length>0;
  if(seeded && process.argv.includes("--verify-login")) ownerLoginPassword=await passwordPrompt();
  if(!seeded){
    const password=await passwordPrompt();
    ownerLoginPassword=password;
    if(password.length<12)throw new Error('Use a password of at least 12 characters.');
    const child=launch(['dist/seed.js'],apiRoot,{...env,OWNER_USERNAME:'Aravind',OWNER_PASSWORD:password});
    const code=await new Promise(resolve=>child.once('exit',resolve));
    if(code!==0)throw new Error('Sample import failed.');
    await pg.exec('DEALLOCATE ALL');
  }
  const api=launch(['dist/main.js'],apiRoot,env);
  let ready=false;
  for(let i=0;i<100;i++){
    if(api.exitCode!==null)break;
    try{const response=await fetch('http://127.0.0.1:3001/api/health');if(response.ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  if(!ready)throw new Error('API startup failed.');
  const web=launch([root+'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4173','--strictPort'],root+'apps/web',env);
  for(const child of [api,web]) child.once('exit',code=>{if(!stopping)void stop(code||0);});
  let webReady=false;
  for(let i=0;i<100;i++){
    if(web.exitCode!==null)break;
    try{const response=await fetch('http://127.0.0.1:4173/api/health');if(response.ok){webReady=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  if(!webReady)throw new Error('Frontend/API proxy startup failed.');
  const page=await fetch('http://127.0.0.1:4173');
  if(!page.ok)throw new Error('Frontend page failed.');
  if(ownerLoginPassword){
    const response=await fetch('http://127.0.0.1:4173/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:4173'},body:JSON.stringify({username:'Aravind',password:ownerLoginPassword})});
    ownerLoginPassword=undefined;
    if(!response.ok)throw new Error('The Aravind login check failed. Existing passwords are never reset automatically.');
    const session=await response.json();
    const orders=await fetch('http://127.0.0.1:4173/api/orders',{headers:{Authorization:'Bearer '+session.accessToken}}).then(r=>r.json());
    console.log('Verified username login and '+orders.total+' database orders through the frontend API proxy.');
    const cookie=response.headers.get('set-cookie')?.split(';')[0];
    if(cookie)await fetch('http://127.0.0.1:4173/api/auth/logout',{method:'POST',headers:{Cookie:cookie}});
  }
  console.log('\nOpen http://localhost:4173 — username Aravind.');
  console.log('Local data is stored in .local-data/postgres using PGlite through Prisma.');
  console.log('This local database is separate from Prisma Postgres cloud. Press Ctrl+C to stop.\n');
}catch(error){console.error(error.message);await stop(1);}
