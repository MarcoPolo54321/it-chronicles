import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const www=path.join(root,'www');
const sourceExtensions=new Set(['.js','.css','.html','.json']);

function walk(dir){
  const output=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())output.push(...walk(full));
    else output.push(full);
  }
  return output;
}

const references=new Set();
for(const file of walk(www)){
  if(!sourceExtensions.has(path.extname(file).toLowerCase()))continue;
  const text=fs.readFileSync(file,'utf8');
  for(const match of text.matchAll(/(?:\.\/)?assets\/[A-Za-z0-9_./-]+(?:\?[A-Za-z0-9_=&.-]+)?/g))references.add(match[0].split('?')[0].replace(/^\.\//,''));
}

for(const reference of references){
  const target=path.join(www,reference);
  if(fs.existsSync(target))continue;
  // Dynamic paths such as assets/workspace/rooms/room-${stage}.webp are
  // represented in source as a static prefix ending with '-'.
  const dir=path.dirname(target);
  const prefix=path.basename(target);
  const hasDynamicTarget=prefix.endsWith('-')&&fs.existsSync(dir)&&fs.readdirSync(dir).some(name=>name.startsWith(prefix));
  assert.ok(hasDynamicTarget,`Missing asset: ${reference}`);
}

for(const density of ['mipmap-mdpi','mipmap-hdpi','mipmap-xhdpi','mipmap-xxhdpi','mipmap-xxxhdpi']){
  for(const file of ['ic_launcher.png','ic_launcher_round.png'])assert.ok(fs.existsSync(path.join(root,'resources','android-icons',density,file)),`Missing Android icon: ${density}/${file}`);
}

const ui169=walk(path.join(www,'assets','ui-v169')).filter(file=>fs.statSync(file).isFile());
assert.equal(ui169.length,53);
console.log(`Asset validation: OK · references ${references.size} · ui-v169 ${ui169.length} · Android icons 10`);
