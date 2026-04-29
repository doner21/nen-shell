const { spawn } = require('node:child_process');
const args = ['--provider','google-gemini-cli','--model','gemini-2.5-flash','--mode','text','--no-tools','--no-extensions','--no-skills','--no-prompt-templates','--no-themes','--no-context-files','--no-session','-p','Reply with exactly: node-spawn-live'];
const child = spawn(process.argv[2] || 'pi', args, { shell: process.argv[3] === 'shell', windowsHide: true });
let out='', err='';
child.stdout.on('data', d => out += d);
child.stderr.on('data', d => err += d);
child.on('close', (code, signal) => { console.log({code, signal, out, err}); });
child.on('error', e => console.error('ERROR', e));
setTimeout(()=>{ console.error('timeout killing'); child.kill(); }, 60000);
