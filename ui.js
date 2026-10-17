const crypto = require('crypto');
module.exports = (app, db, { esc, now, rnd, bcrypt, PROD, BASE_URL, env }) => {
  const [DID, DSEC] = [env.DISCORD_CLIENT_ID, env.DISCORD_CLIENT_SECRET];
  const dOK = !!(DID && DSEC);
  ['apps|paused INTEGER DEFAULT 0', "apps|version TEXT DEFAULT '1.0'", 'apps|hwid_lock INTEGER DEFAULT 1', 'apps|force_hwid INTEGER DEFAULT 0',
    'apps|update_link TEXT', 'apps|webhook TEXT', 'apps|botkey TEXT', 'keys|note TEXT', 'users|email TEXT', 'users|hwid_lock INTEGER DEFAULT 1',
    'users|last_login INTEGER DEFAULT 0', 'apps|last_seen INTEGER DEFAULT 0', 'accounts|pass_hash TEXT'].forEach(s => { const [t, c] = s.split('|'); try { db.exec(`ALTER TABLE ${t} ADD COLUMN ${c}`); } catch {} });
  const q1 = (s, ...a) => db.prepare(s).get(...a), qa = (s, ...a) => db.prepare(s).all(...a), run = (s, ...a) => db.prepare(s).run(...a);

  const CSS = `*{box-sizing:border-box}body{margin:0;font:15px Inter,system-ui,sans-serif;background:#0d0d0f;color:#e8e8ea}a{color:#3b82f6;text-decoration:none}h1,h2,h3{margin:0}
button,input,select{font:inherit;color:#fff;background:#141416;border:1px solid #26282c;border-radius:8px;padding:10px 12px;outline:0}button{cursor:pointer}input:focus,select:focus{border-color:#2563eb}
.btn{background:#1d4ed8;border:0;font-weight:600;border-radius:8px;padding:10px 16px;display:inline-block;color:#fff}.d{background:#18191c;border:1px solid #2a2c31}.dis{opacity:.4;pointer-events:none}.w{background:#fff;color:#111}
.g{background:#166534}.p{background:#7e22ce}.o{background:#c2410c}.r{background:#b91c1c}.y{background:#a16207}.t{background:#0e7490}.b{background:#1e3a8a}
.card{background:#141416;border:1px solid #222428;border-radius:12px;padding:20px;margin-bottom:16px}.muted{color:#8b8d93;font-size:12px}code{background:#09090a;padding:3px 7px;border-radius:6px;word-break:break-all;font-size:12px}
.logo{font-weight:800;font-size:22px;color:#fff}.logo:after{content:'';display:inline-block;width:7px;height:7px;background:#2563eb;border-radius:50%;margin-left:3px}.sp{flex:1}
.nav{display:flex;gap:26px;align-items:center;max-width:1000px;margin:12px auto;padding:14px 22px;background:#141416;border:1px solid #222428;border-radius:16px}.nav a{color:#d4d4d8;font-size:14px}.nav .btn{color:#fff}
.hero{display:grid;grid-template-columns:1fr 1fr;gap:30px;max-width:1150px;margin:60px auto;padding:0 24px;align-items:center}.hero h1{font-size:64px;line-height:1.05}.hero em{color:#3b82f6;font-style:normal}.lead{color:#9ca3af;font-size:19px;line-height:1.5;margin:22px 0 30px}
.mock{transform:perspective(900px) rotateY(-14deg) rotateX(4deg);background:#111214;border:1px solid #26282c;border-radius:12px;height:300px;display:flex;gap:10px;padding:12px}.mock u{width:50px;background:#18191c;border-radius:8px}.mock div{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:10px}.mock i{background:#18191c;border-radius:8px;border-top:3px solid #1d4ed8}
.cookie{position:fixed;left:0;right:0;bottom:0;background:#101012;border-top:3px solid #2563eb;padding:20px 8vw;display:flex;gap:14px;align-items:center}
.ctr{min-height:100vh;display:grid;place-items:center}.acard{width:min(460px,92vw);background:#141416;border:1px solid #222428;border-radius:16px;padding:36px;text-align:center}.acard .logo{font-size:34px;margin-bottom:16px}.sbtn{display:block;margin:12px 0;padding:14px;border-radius:10px;background:#18191c;border:1px solid #2a2c31;color:#fff;font-weight:600}.sbtn:hover{border-color:#2563eb}
.app{display:flex;min-height:100vh}.side{width:255px;background:#101012;border-right:1px solid #1c1d20;padding:18px 14px;display:flex;flex-direction:column;gap:10px;position:sticky;top:0;height:100vh}.side select{width:100%;font-weight:600}.side nav{display:flex;flex-direction:column;gap:2px;flex:1}.side nav a{color:#d4d4d8;padding:10px 12px;border-radius:8px;display:flex;gap:12px}.side nav a:hover,.side nav a.on{background:#1a1b1e}.side nav span{width:18px;text-align:center}.lo{color:#8b8d93;padding:10px 12px}
.main{flex:1;padding:16px 22px;min-width:0}.top{display:flex;gap:12px;align-items:center;margin-bottom:16px}.top input{width:300px}.chip{display:flex;flex-direction:column;background:#141416;border:1px solid #222428;border-radius:12px;padding:8px 16px}.chip small{color:#8b8d93}.crumb{font-size:13px;margin-bottom:14px}h2{font-size:26px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px}.stats .card{text-align:center;margin:0}.stats b{display:block;font-size:30px}
.cols{display:grid;grid-template-columns:5fr 7fr;gap:16px}.cred{background:#101012;border:1px solid #1f2024;border-radius:10px;padding:12px 14px;margin:10px 0;position:relative}.cred small{font-size:10px;letter-spacing:.8px;color:#9ca3af}.cred div{font-weight:600;margin-top:6px;word-break:break-all}.cred button{position:absolute;right:8px;top:8px;padding:2px 7px;background:0;border:0;color:#9ca3af}
.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.badge{background:#14532d;color:#86efac;font-size:11px;padding:3px 10px;border-radius:99px}.bad{background:#7c2d12;color:#fdba74}
.bar{display:flex;gap:8px;align-items:center;margin-bottom:16px}.bar .s{width:380px}.ib{padding:9px 11px;border:1px solid #2a2c31;color:#fff}.sel{display:block;margin:10px 0}.sel input{margin-right:8px}
table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #222428;text-align:left;font-size:14px}.empty{text-align:center;padding:50px 0;color:#d4d4d8;line-height:3}.pg{display:flex;justify-content:space-between}
dialog{background:#141416;color:#fff;border:1px solid #2a2c31;border-radius:14px;width:min(480px,94vw);padding:24px}dialog::backdrop{background:#000a}dialog label{display:block;margin:14px 0 6px;font-size:13px;color:#9ca3af}dialog input,dialog select{width:100%}.acts{display:flex;justify-content:flex-end;gap:10px;margin-top:22px}
.tg{display:flex;align-items:center;gap:14px;background:#101012;border:1px solid #1f2024;border-radius:10px;padding:14px;margin:10px 0}.tg input{appearance:none;width:44px;height:24px;border-radius:99px;background:#3f3f46;border:0;position:relative;padding:0;flex:none}.tg input:checked{background:#2563eb}.tg input:after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:.15s}.tg input:checked:after{left:23px}
pre{background:#09090a;padding:14px;border-radius:8px;overflow:auto;font-size:12px}footer{margin-top:30px;padding:18px;color:#8b8d93;font-size:13px;border:1px solid #222428;border-radius:12px}
.st{font-size:13px;padding:5px 12px;border-radius:99px;background:#27272a;color:#d4d4d8}.st.ok{background:#14532d;color:#86efac}pre.code{background:#0b0b0d;border:1px solid #1f2024;line-height:1.6;font-size:13px;padding:18px}.k{color:#fb923c}.s{color:#7dd3fc}.c{color:#6b7280}.err{color:#f87171;font-size:13px}.skiptranslate iframe,.goog-te-banner-frame{display:none!important}body{top:0!important}@media(max-width:900px){.hero,.cols,.stats{grid-template-columns:1fr}.side{display:none}.hero h1{font-size:42px}}`;

  const LANGS = { en: 'English', pt: 'Português', es: 'Español', fr: 'Français', de: 'Deutsch', ru: 'Русский', tr: 'Türkçe', ar: 'العربية', 'zh-CN': '中文', ja: '日本語' };
  const langSel = `<select id=lang class=notranslate title="Translate" onchange="document.cookie='googtrans=/en/'+this.value+';path=/';location.reload()">${Object.entries(LANGS).map(([k, v]) => `<option value="${k}">🌐 ${v}</option>`).join('')}</select>`;
  const TR = `<div id=gt style=display:none></div><script>var c=document.cookie.split('googtrans=/en/')[1];if(c)lang.value=c.split(';')[0];function gtI(){new google.translate.TranslateElement({pageLanguage:'en',autoDisplay:false},'gt')}</script><script src="https://translate.google.com/translate_a/element.js?cb=gtI"></script>`;
  const doc = (t, b) => `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>${t} - Nvex Auth</title><style>${CSS}</style>${b}${TR}`;
  const auth = (req, res, next) => req.session.accountId ? next() : res.redirect('/login');

  // ---------- Site público ----------
  app.get('/', (req, res) => res.send(doc('Authentication made for everyone', `
<nav class=nav><span class=logo>Nvex Auth</span><span class=sp></span>${langSel}<a href=/login>Log in</a><a class=btn href=/signup>Sign up</a></nav>
<main class=hero><div><h1>Authentication made for <em>everyone!</em></h1><p class=lead>Secure, scalable, and game-changing authentication for your applications. Get started in minutes with our powerful APIs and SDKs.</p>
<a class=btn href=/signup>Start for free →</a></div><div class=mock><u></u><div><i></i><i></i><i></i><i></i></div></div></main>
<p class=muted style=text-align:center>Integrate into any programming language</p>
<div class=cookie id=ck><div class=sp><b>🍪 We value your privacy</b><br><span class=muted>We use cookies to enhance your browsing experience. By clicking "Accept All", you consent to our use of cookies.</span></div><button class="btn d" onclick="ck.remove()">Decline</button><button class=btn onclick="localStorage.ck=1;ck.remove()">Accept All</button></div><script>if(localStorage.ck)ck.remove()</script>`)));

  const authPage = m => (req, res) => res.send(doc(m == 'signup' ? 'Sign up' : 'Log in', `<div class=ctr><div class=acard><div class=logo>Nvex Auth</div>
<p>${m == 'signup' ? 'Have an account? <a href=/login>Sign in</a>' : 'New here? <a href=/signup>Sign up</a>'}</p>
<a class=sbtn style="border-color:#5865f2" href=/auth/discord>Continue with Discord</a><a class=sbtn href=/auth/google>Continue with Google</a>
<p class=muted>By continuing, you agree to our Terms of Service and Privacy Policy.</p></div></div>`));
  app.get('/signup', authPage('signup')); app.get('/login', authPage('login'));
  app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/')));
  app.get('/docs', (req, res) => res.send(doc('Docs', `<div style="max-width:800px;margin:40px auto;padding:0 20px"><a href=/>← Home</a><h2>API</h2><p>POST JSON to <code>${esc(BASE_URL)}/api/1.0</code> with <code>ownerid</code> and <code>secret</code> from your dashboard.</p>
<pre>{"type":"init"}\n{"type":"register","username":"u","password":"p","key":"LICENSE","hwid":"abc"}\n{"type":"login","username":"u","password":"p","hwid":"abc"}\n{"type":"license","key":"LICENSE","hwid":"abc"}</pre></div>`)));

  // ---------- Login (Discord e Google + código por e-mail) ----------
  const signin = (req, res, pid, name, hash) => {
    run('INSERT INTO accounts(discord_id,name) VALUES(?,?) ON CONFLICT(discord_id) DO UPDATE SET name=excluded.name', pid, name);
    if (hash) run('UPDATE accounts SET pass_hash=? WHERE discord_id=?', hash, pid);
    const id = q1('SELECT id FROM accounts WHERE discord_id=?', pid).id;
    req.session.regenerate(() => { req.session.accountId = id; res.redirect('/app'); });
  };
  const form = o => new URLSearchParams(o);
  const post = async (u, o) => (await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(o) })).json();

  // Discord: login real (tela de autorização do Discord)
  app.get('/auth/discord', (req, res) => {
    if (!dOK) return res.send(doc('Setup', `<div class=ctr><div class=acard><div class=logo>Nvex Auth</div><h3>Discord login is not set up yet</h3><p class=muted>Add DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET to the environment variables (see PUBLICAR.md).</p><a class=btn href=/login>Back</a></div></div>`));
    const s = req.session.state = rnd(16);
    res.redirect('https://discord.com/oauth2/authorize?' + form({ client_id: DID, redirect_uri: BASE_URL + '/callback', response_type: 'code', scope: 'identify', state: s }));
  });
  app.get('/callback', async (req, res) => {
    try {
      if (!req.query.code || req.query.state !== req.session.state) return res.status(400).send('Invalid state');
      const t = await post('https://discord.com/api/oauth2/token', { client_id: DID, client_secret: DSEC, grant_type: 'authorization_code', code: req.query.code, redirect_uri: BASE_URL + '/callback' });
      const u = await (await fetch('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + t.access_token } })).json();
      if (!u.id) return res.status(400).send('Login failed');
      signin(req, res, 'discord:' + u.id, u.username);
    } catch { res.status(500).send('Login error'); }
  });

  // Google: e-mail + senha, e um código de 6 dígitos é enviado ao e-mail real
  let nm; try { nm = require('nodemailer'); } catch {}
  const port = +(env.SMTP_PORT || 465);
  const smtp = nm && env.SMTP_USER && env.SMTP_PASS ? nm.createTransport({ host: env.SMTP_HOST || 'smtp.gmail.com', port, secure: port == 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }) : null;
  const sendMail = async (to, code) => {
    const subject = 'Your Nvex Auth code', html = `<p>Your access code is <b style="font-size:24px">${code}</b><br>It expires in 10 minutes.</p>`;
    try {
      if (smtp) { await smtp.sendMail({ from: env.MAIL_FROM || `Nvex Auth <${env.SMTP_USER}>`, to, subject, html }); return true; }
      if (env.RESEND_API_KEY) return (await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: env.MAIL_FROM || 'Nvex Auth <onboarding@resend.dev>', to, subject, html }) })).ok;
    } catch (e) { console.log('[mail error]', e.message); }
    return false;
  };
  const hits = new Map(), ERR = new Map(Object.entries({ pw: 'Wrong password.', mail: 'Could not send the email. Check the SMTP settings.', bad: 'Enter a valid email and a password with 8+ characters.', many: 'Too many attempts. Try again in a few minutes.' }));
  const field = (n, t, p) => `<input name=${n} type=${t} placeholder="${p}" required style="width:100%;margin:6px 0;padding:14px">`;
  app.get('/auth/google', (req, res) => res.send(doc('Continue with Google', `<div class=ctr><form class=acard method=post action=/auth/google><div class=logo>Nvex Auth</div><p class=muted>Enter your Google email and a password. We will send a code to your email to verify it.</p>
${req.query.e ? `<p class=err>${ERR.get(req.query.e) || 'Error.'}</p>` : ''}${field('email', 'email', 'Email')}${field('password', 'password', 'Password (8+ characters)')}<br><button class=btn style=width:100%>Verify →</button><p><a href=/login>← Back</a></p></form></div>`)));
  app.post('/auth/google', async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase().slice(0, 120), pw = String(req.body.password || '');
    if (!/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(email) || pw.length < 8) return res.redirect('/auth/google?e=bad');
    const h = (hits.get(req.ip) || []).filter(t => Date.now() - t < 6e5); h.push(Date.now()); hits.set(req.ip, h);
    if (h.length > 6) return res.redirect('/auth/google?e=many');
    const acc = q1('SELECT * FROM accounts WHERE discord_id=?', 'email:' + email);
    if (acc && !(acc.pass_hash && bcrypt.compareSync(pw, acc.pass_hash))) return res.redirect('/auth/google?e=pw');
    const code = String(crypto.randomInt(1e5, 1e6));
    if (!(await sendMail(email, code))) return res.redirect('/auth/google?e=mail');
    req.session.pending = { email, code, exp: Date.now() + 6e5, tries: 0, hash: acc ? null : bcrypt.hashSync(pw, 10) };
    res.redirect('/verify');
  });
  app.get('/verify', (req, res) => {
    const p = req.session.pending; if (!p) return res.redirect('/login');
    res.send(doc('Verify', `<div class=ctr><form class=acard method=post action=/verify><div class=logo>Nvex Auth</div><h3>Check your email</h3><p class=muted>We sent a 6-digit access code to ${esc(p.email)}.</p>${req.query.e ? '<p class=err>Wrong code.</p>' : ''}
<input name=code inputmode=numeric maxlength=6 placeholder=000000 style="width:100%;text-align:center;font-size:24px;letter-spacing:8px" autofocus><br><br><button class=btn style=width:100%>Verify & continue</button></form></div>`));
  });
  app.post('/verify', (req, res) => {
    const p = req.session.pending; if (!p) return res.redirect('/login');
    if (++p.tries > 5 || Date.now() > p.exp) { delete req.session.pending; return res.redirect('/login'); }
    if (String(req.body.code).trim() !== p.code) return res.redirect('/verify?e=1');
    signin(req, res, 'email:' + p.email, p.email.split('@')[0], p.hash);
  });

  
// ---------- Painel ----------
  const cur = req => {
    const id = req.session.appId; let a = id && q1('SELECT * FROM apps WHERE id=? AND account_id=?', id, req.session.accountId);
    if (!a) { a = q1('SELECT * FROM apps WHERE account_id=? ORDER BY id LIMIT 1', req.session.accountId); if (a) req.session.appId = a.id; }
    return a;
  };
  const NAV = [['/app', 'Manage Apps', '▦'], ['/app/licenses', 'Licenses', '⚷'], ['/app/users', 'Users', '☺'], ['/app/tokens', 'Tokens', '🔒'], ['/app/subscriptions', 'Subscriptions', '⛨'],
    ['/app/sessions', 'Sessions', '◔'], ['/app/settings', 'Settings', '⚙'], ['/app/botkey', 'Add Bot Key', '🤖']];
  const shell = (req, a, active, title, sub, body) => {
    const acc = q1('SELECT * FROM accounts WHERE id=?', req.session.accountId), apps = qa('SELECT id,name FROM apps WHERE account_id=?', acc.id);
    return doc(title, `<div class=app><aside class=side><div class=logo style="padding:6px 10px 12px">Nvex Auth</div>
<form method=post action=/act/app/select><select name=id onchange=this.form.submit()>${apps.map(x => `<option value=${x.id} ${a && a.id == x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('') || '<option>No applications</option>'}</select></form>
<nav>${NAV.map(([h, n, i]) => `<a href=${h} class="${h == active ? 'on' : ''}"><span>${i}</span>${n}</a>`).join('')}</nav><a class=lo href=/logout>⎋ Log out</a></aside>
<section class=main><div class=top><input placeholder="Search pages..." oninput="for(const l of document.querySelectorAll('.side nav a'))l.style.display=l.textContent.toLowerCase().includes(this.value.toLowerCase())?'':'none'"><span class=sp></span>${langSel}<div class=chip><b>${esc(acc.name)}</b><small>Pro plan</small></div></div>
<div class=card><div class=crumb>⌂ Manage Apps » Current Application: ${a ? esc(a.name) : 'none'}</div><h2>${title}</h2><div class=muted>${sub}</div></div>${body}
<footer>Copyright © 2026 Nvex Auth. All Rights Reserved.</footer></section></div>`);
  };
  const P = (path, title, sub, fn) => app.get(path, auth, (req, res) => {
    const a = cur(req); if (!a && path != '/app') return res.redirect('/app');
    res.send(shell(req, a, path, title, sub, fn(req, a)));
  });
  const dlg = (id, title, action, inner, btn) => `<dialog id=${id}><form method=post action="${action}"><h3>${title}</h3>${inner}<div class=acts><button type=button class="btn w" onclick="this.closest('dialog').close()">Cancel</button><button class=btn>${btn}</button></div></form></dialog>`;
  const copy = v => `<button onclick="navigator.clipboard.writeText(this.dataset.v)" data-v="${esc(v)}">⧉</button>`;
  const fmt = t => t ? new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ') : '-';
  const hid = (k, v) => `<input type=hidden name=${k} value="${esc(v)}">`;

  app.get('/app/status', auth, (req, res) => { const a = cur(req); res.json({ ago: a && a.last_seen ? now() - a.last_seen : null }); });
  const hl = c => esc(c).replace(/(\/\/.*|# .*)|(&quot;.*?&quot;)|\b(using|var|new|await|import|const|print)\b/g, (m, c1, c2) => `<span class=${c1 ? 'c' : c2 ? 's' : 'k'}>${m}</span>`);
  const connectCard = a => {
    const n = a.name.replace(/["\\]/g, ''), o = a.ownerid, s = a.secret, v = a.version || '1.0', u = BASE_URL + '/api/1.0';
    const sn = {
      'C#': `using System.Net.Http.Json;\n\nvar http = new HttpClient();\nvar res = await http.PostAsJsonAsync("${u}", new {\n    type = "init",\n    name = "${n}",\n    ownerid = "${o}",\n    secret = "${s}",\n    version = "${v}"\n});\nConsole.WriteLine(await res.Content.ReadAsStringAsync());`,
      Python: `import requests\n\nr = requests.post("${u}", json={\n    "type": "init",\n    "name": "${n}",\n    "ownerid": "${o}",\n    "secret": "${s}",\n    "version": "${v}",\n})\nprint(r.json())`,
      JavaScript: `const r = await fetch("${u}", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({ type: "init", name: "${n}", ownerid: "${o}", secret: "${s}", version: "${v}" }),\n});\nconsole.log(await r.json());`,
      cURL: `curl -X POST "${u}" -H "Content-Type: application/json" -d "{\\"type\\":\\"init\\",\\"ownerid\\":\\"${o}\\",\\"secret\\":\\"${s}\\"}"`,
    }, ks = Object.keys(sn);
    return `<div class=card><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><h3>Connect your project</h3><span class=sp></span><span id=det class=st>⏳ Waiting for your project to connect...</span></div>
<p class=muted>Paste this code into your project and run it once. We detect the connection automatically.</p>
<div class=muted style="margin:12px 0">Select Language: <select onchange="for(const p of document.querySelectorAll('pre.code'))p.style.display=p.id=='L'+this.value?'':'none'">${ks.map((k, i) => `<option value=${i}>${k}</option>`).join('')}</select></div>
${ks.map((k, i) => `<pre class=code id=L${i} ${i ? 'style=display:none' : ''}>${hl(sn[k])}</pre>`).join('')}</div>
<script>async function chk(){try{const j=await (await fetch('/app/status')).json();if(j.ago!==null){det.className='st ok';det.textContent='✅ Connected — last request '+(j.ago<60?j.ago+'s':Math.floor(j.ago/60)+' min')+' ago'}}catch{}}chk();setInterval(chk,4000)</script>`;
  };

  
P('/app', 'Manage Applications', 'Manage your applications. Applications are the backbone of all the data.', (req, a) => {
    const all = qa('SELECT * FROM apps WHERE account_id=?', req.session.accountId), paused = all.filter(x => x.paused).length;
    const sess = q1('SELECT COUNT(*) c FROM users WHERE last_login>? AND app_id IN (SELECT id FROM apps WHERE account_id=?)', now() - 3600, req.session.accountId).c;
    const cred = (l, v) => `<div class=cred><small>${l}</small>${copy(v)}<div>${esc(v)}</div></div>`;
    return `<div class=stats>${[['Total Apps', all.length], ['Active', all.length - paused], ['Paused', paused], ['Active Sessions', sess]].map(([n, v]) => `<div class=card><b>${v}</b>${n}</div>`).join('')}</div>
<div class=cols><div class=card><h3>Application Credentials</h3><p class=muted>Use these values to connect your project.</p>${a ? cred('APPLICATION NAME', a.name) + cred('ACCOUNT OWNER ID', a.ownerid) + cred('APPLICATION SECRET', a.secret) + cred('APPLICATION VERSION', a.version || '1.0') + cred('API URL', BASE_URL + '/api/1.0') +
      `<form method=post action=/act/app/refresh>${hid('id', a.id)}<button class="btn o">⟳ Refresh Application Secret</button></form>` : '<p class=muted>Create your first application.</p>'}</div>
<div class=card><h3>My Applications</h3><br><button class="btn" style=width:100% onclick=ca.showModal()>＋ Create Application</button>
${all.map(x => `<div class=cred style="padding:18px"><span class="badge ${x.paused ? 'bad' : ''}" style="float:right">${x.paused ? 'PAUSED' : 'ACTIVE'}</span><h3>${esc(x.name)}</h3>
<p class=muted>Version ${esc(x.version || '1.0')} · Users ${q1('SELECT COUNT(*) c FROM users WHERE app_id=?', x.id).c}</p>
<div class=row>${[['select', 'g', a && a.id == x.id ? 'Selected' : 'Select'], ['rename', 'p', 'Rename'], ['pause', 'o', x.paused ? 'Resume' : 'Pause'], ['delete', 'r', 'Delete']].map(([k, c, t]) => `<form method=post action=/act/app/${k}>${hid('id', x.id)}${k == 'rename' ? '<input type=hidden name=name>' : ''}<button class="btn ${c}" ${k == 'rename' ? `onclick="var n=prompt('New name');if(!n)return false;this.form.name.value=n"` : k == 'delete' ? `onclick="return confirm('Delete this app and all its data?')"` : ''}>${t}</button></form>`).join('')}</div></div>`).join('')}</div></div>
${a ? connectCard(a) : ''}
${dlg('ca', 'Create Application', '/act/app/create', '<label>Application name</label><input name=name required maxlength=40>', 'Create')}`;
  });

  const B = (c, act, t, i, x = '') => `<button form=bf name=act value=${act} title="${t}" class="ib ${c}" ${x}>${i}</button>`;
  const ADD = `onclick="var d=prompt('Days to add (negative to remove):','1');if(!d)return false;bf.days.value=d"`, DEL = `onclick="return confirm('Delete selected?')"`;
  const list = (act, rows, p, head, cell, btns, empty, create, dId) => `<div class=card><div class=bar><input class=s placeholder="Search ${act}..." oninput="for(const r of document.querySelectorAll('tbody tr'))r.style.display=r.textContent.toLowerCase().includes(this.value.toLowerCase())?'':'none'"><span class=sp></span>${btns}</div>
<form method=post action=/act/${act}/bulk id=bf><input type=hidden name=days><label class=sel><input type=checkbox onclick="for(const c of document.querySelectorAll('[name=ids]'))c.checked=this.checked">Select All</label>
${rows.length ? `<table><thead><tr><th></th>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.slice(0, 25).map(r => `<tr><td><input type=checkbox name=ids value=${r.id}></td>${cell(r)}</tr>`).join('')}</tbody></table>`
      : `<div class=empty>${empty}${create ? `<br><button type=button class=btn onclick=${dId}.showModal()>${create}</button>` : ''}</div>`}</form>
<div class=pg><a class="btn d ${p ? '' : 'dis'}" href="?p=${p - 1}">Previous</a><a class="btn d ${rows.length > 25 ? '' : 'dis'}" href="?p=${p + 1}">Next</a></div></div>`;
  const pg = req => Math.max(0, +req.query.p || 0);

  P('/app/licenses', 'Licenses', 'Licenses allow your users to register on your application.', (req, a) => {
    const p = pg(req), rows = qa('SELECT * FROM keys WHERE app_id=? ORDER BY id DESC LIMIT 26 OFFSET ?', a.id, p * 25);
    return list('licenses', rows, p, ['Key', 'Level', 'Duration', 'Note', 'Status'], r => `<td><code>${esc(r.key)}</code></td><td>1</td><td>${Math.round(r.days * 100) / 100} day(s)</td><td>${esc(r.note || '')}</td><td>${r.used_by ? 'Used by ' + esc(r.used_by) : 'Not used'}</td>`,
      `<button type=button class="ib g" title=Create onclick=cl.showModal()>🔑</button>${B('b', 'addtime', 'Add time', '⏱', ADD)}${B('p', 'export', 'Export', '⭳')}${B('r', 'delete', 'Delete', '🗑', DEL)}`, '🎫 Get started by creating your first license.', 'Create License', 'cl') +
      dlg('cl', 'Create a new license', '/act/licenses/create', `<label>License Amount *</label><input name=amount type=number min=1 max=100 value=1><label>License Mask *</label><input name=mask value="******-******-******-******-******-******">
<label style=display:inline><input type=checkbox name=lower style=width:auto> Lowercase Letters</label> &nbsp; <label style=display:inline><input type=checkbox name=upper style=width:auto> Uppercase Letters</label>
<label>Subscription Level *</label><select><option>1 (default)</option></select><label>License Note</label><input name=note maxlength=80>
<div style="display:flex;gap:12px"><div style=flex:1><label>Expiry Unit *</label><select name=unit>${['Days', 'Hours', 'Weeks', 'Months', 'Years', 'Lifetime'].map(u => `<option>${u}</option>`).join('')}</select></div><div style=flex:1><label>Expiry Duration *</label><input name=duration type=number min=1 value=30></div></div>`, 'Create License');
  });

  P('/app/users', 'Users', 'After someone registers for your app with a license, they will appear here.', (req, a) => {
    const p = pg(req), rows = qa('SELECT * FROM users WHERE app_id=? ORDER BY id DESC LIMIT 26 OFFSET ?', a.id, p * 25);
    return list('users', rows, p, ['Username', 'Email', 'Subscription', 'Expires', 'HWID', 'Status'], r => `<td>${esc(r.username)}</td><td>${esc(r.email || '-')}</td><td>default</td><td>${fmt(r.expires)}</td><td>${esc(r.hwid || '-')}</td><td>${r.banned ? '🚫 Banned' : r.expires < now() ? 'Expired' : 'Active'}</td>`,
      `<button type=button class="ib g" title="Create user" onclick=cu.showModal()>👤</button>${B('b', 'addtime', 'Add time', '⏱', ADD)}${B('y', 'resethwid', 'Reset HWID', '↺')}${B('o', 'ban', 'Ban / unban', '⛔')}${B('p', 'export', 'Export', '⭳')}${B('r', 'delete', 'Delete', '🗑', DEL)}`, '👤 Get started by creating your first user.', 'Create User', 'cu') +
      dlg('cu', 'Create user', '/act/users/create', `<label>Username *</label><input name=username required maxlength=40><label>Password</label><input name=password><label>Email</label><input name=email type=email><label>Subscription *</label><input value=default disabled>
<label>Expiration *</label><input id=ex name=expires type=datetime-local><script>ex.value=new Date(Date.now()+2592e6-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16)</script><label style=display:inline><input type=checkbox name=hwid style=width:auto> HWID Affected</label>`, 'Create User');
  });

  const empty = t => `<div class=card><div class=empty>${t}</div></div>`;
  P('/app/tokens', 'Tokens', 'Tokens act as access keys. Licenses let users log in/register; tokens let the user access the program completely.', () => empty('🔑 No tokens found for this application. Tokens will appear after you create your first license or user.'));
  P('/app/subscriptions', 'Subscriptions', 'Subscription levels let you limit features per license.', () => empty('Level 1 (default) is available. More levels are coming soon.'));
  P('/app/sessions', 'Sessions', 'All of your active sessions. (Active Users)', (req, a) => {
    const p = pg(req), rows = qa('SELECT * FROM users WHERE app_id=? AND last_login>? ORDER BY last_login DESC LIMIT 26 OFFSET ?', a.id, now() - 3600, p * 25);
    return list('sessions', rows, p, ['User', 'Last login', 'HWID'], r => `<td>${esc(r.username)}</td><td>${fmt(r.last_login)}</td><td>${esc(r.hwid || '-')}</td>`, B('r', 'delete', 'Kill sessions', '🗑', DEL), '🚫 No sessions found for this application.', '', '');
  });

  P('/app/settings', 'Settings', 'Control your application here. Tip: You can press Ctrl + S to save settings!', (req, a) => {
    const tg = (n, t, d, on) => `<label class=tg><input type=checkbox name=${n} ${on ? 'checked' : ''}><span><b>${t}</b><br>${d}</span></label>`;
    return `<form method=post action=/act/settings id=sf><div class=cols style="grid-template-columns:1fr 1fr"><div class=card><h3>Access Controls</h3>
${tg('status', 'App Status', 'Enable or disable the application, preventing users from logging in', !a.paused)}${tg('hwid_lock', 'HWID Lock', 'Lock users to a value from your user\'s device. Use this to prevent people from sharing your product.', a.hwid_lock)}${tg('force_hwid', 'Force HWID', 'Prevent users from logging in with a blank HWID', a.force_hwid)}</div>
<div class=card><h3>Download & Update</h3><p class=muted>Application Version</p><input name=version value="${esc(a.version || '1.0')}" style=width:100%><p class=muted>Auto-Update Download Link</p><input name=update_link value="${esc(a.update_link || '')}" style=width:100%>
<br><br><h3>Logging & Integration</h3><p class=muted>Discord Webhook Link (logins and registrations)</p><input name=webhook value="${esc(a.webhook || '')}" style=width:100%></div></div><button class=btn>Save settings</button></form>
<script>addEventListener('keydown',e=>{if(e.ctrlKey&&e.key=='s'){e.preventDefault();sf.submit()}})</script>`;
  });

  P('/app/botkey', 'Add Bot Key', 'Let your Discord bot create keys and users automatically and deliver them to your customers.', (req, a) => `<div class=card><h3>Bot key for ${esc(a.name)}</h3>
${a.botkey ? `<div class=cred><small>BOT KEY (keep it secret)</small>${copy(a.botkey)}<div>${esc(a.botkey)}</div></div>` : '<p class=muted>No bot key yet.</p>'}
<form method=post action=/act/botkey><button class=btn onclick="return !${!!a.botkey}||confirm('The old key will stop working. Continue?')">${a.botkey ? 'Regenerate Bot Key' : 'Generate Bot Key'}</button></form></div>
<div class=card><h3>Run your Discord bot</h3><ol class=muted style="line-height:2"><li>Generate the bot key above.</li><li>Open the <code>discord-bot</code> folder, copy <code>.env.example</code> to <code>.env</code> and fill in <code>NVEX_URL</code>, <code>NVEX_BOT_KEY</code> (this key), <code>DISCORD_BOT_TOKEN</code> and <code>DISCORD_APP_ID</code>.</li><li>Double-click <code>iniciar-bot.bat</code>.</li><li>In Discord use <code>/genkey</code>, <code>/createuser</code> and <code>/addtime</code>. Add <code>send_to</code> to deliver by DM.</li></ol></div>
<div class=card><h3>How to use (POST JSON)</h3><pre>${esc(`${BASE_URL}/api/bot/keys     { "botkey", "amount": 1, "days": 30, "note": "" }  -> { keys: [...] }
${BASE_URL}/api/bot/users    { "botkey", "username", "password", "days": 30 }
${BASE_URL}/api/bot/addtime  { "botkey", "target": "key" | "user", "value": "KEY or username", "days": 7 }

// discord.js example
const r = await fetch('${BASE_URL}/api/bot/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ botkey: 'YOUR_BOT_KEY', amount: 1, days: 30 }) });
const { keys } = await r.json();   // send keys[0] to the customer by DM`)}</pre></div>`);

  // ---------- Ações ----------
  const unit = { Hours: 1 / 24, Days: 1, Weeks: 7, Months: 30, Years: 365, Lifetime: 36500 };
  const mk = (a, n, days, mask = '******-******-******-******-******-******', lower, upper, note) => {
    const cs = '0123456789' + ((!lower && !upper) || upper ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : '') + (lower ? 'abcdefghijklmnopqrstuvwxyz' : ''), out = [];
    for (let i = 0; i < n; i++) {
      const k = String(mask).slice(0, 60).replace(/\*/g, () => cs[crypto.randomInt(cs.length)]);
      try { run('INSERT INTO keys(app_id,key,days,note) VALUES(?,?,?,?)', a.id, k, days, note ? String(note).slice(0, 80) : null); out.push(k); } catch {}
    }
    return out;
  };
  const own = req => q1('SELECT * FROM apps WHERE id=? AND account_id=?', req.body.id, req.session.accountId);
  const A = (path, fn) => app.post(path, auth, (req, res) => { fn(req, res); if (!res.headersSent) res.redirect((path.startsWith('/act/app/') && path != '/act/app/select') ? '/app' : req.get('referer') || '/app'); });

  A('/act/app/create', req => { const n = run('INSERT INTO apps(account_id,name,ownerid,secret) VALUES(?,?,?,?)', req.session.accountId, String(req.body.name || 'My App').slice(0, 40), rnd(5), rnd(32)); req.session.appId = Number(n.lastInsertRowid); });
  A('/act/app/select', req => { const a = own(req); if (a) req.session.appId = a.id; });
  A('/act/app/rename', req => { const a = own(req); if (a && req.body.name) run('UPDATE apps SET name=? WHERE id=?', String(req.body.name).slice(0, 40), a.id); });
  A('/act/app/pause', req => { const a = own(req); if (a) run('UPDATE apps SET paused=1-COALESCE(paused,0) WHERE id=?', a.id); });
  A('/act/app/refresh', req => { const a = own(req); if (a) run('UPDATE apps SET secret=? WHERE id=?', rnd(32), a.id); });
  A('/act/app/delete', req => { const a = own(req); if (a) { ['keys', 'users', 'apps'].forEach(t => run(`DELETE FROM ${t} WHERE ${t == 'apps' ? 'id' : 'app_id'}=?`, a.id)); delete req.session.appId; } });
  A('/act/licenses/create', req => { const a = cur(req), b = req.body; if (a) mk(a, Math.min(100, +b.amount || 1), Math.max(1 / 24, Math.min(36500, (+b.duration || 1) * (unit[b.unit] || 1))), b.mask, !!b.lower, !!b.upper, b.note); });
  A('/act/users/create', req => {
    const a = cur(req), b = req.body; if (!a || !b.username) return;
    try { run('INSERT INTO users(app_id,username,pass_hash,expires,email,hwid_lock) VALUES(?,?,?,?,?,?)', a.id, String(b.username).slice(0, 40), bcrypt.hashSync(String(b.password || rnd(5)), 10), Math.floor(new Date(b.expires).getTime() / 1000) || now() + 2592000, b.email ? String(b.email).slice(0, 80) : null, b.hwid ? 1 : 0); } catch {}
  });
  A('/act/settings', (req, res) => {
    const a = cur(req), b = req.body; if (!a) return;
    const wh = /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(b.webhook || '') ? b.webhook : '';
    run('UPDATE apps SET paused=?,hwid_lock=?,force_hwid=?,version=?,update_link=?,webhook=? WHERE id=?', b.status ? 0 : 1, b.hwid_lock ? 1 : 0, b.force_hwid ? 1 : 0, String(b.version || '1.0').slice(0, 20), String(b.update_link || '').slice(0, 300), wh, a.id);
    res.redirect('/app/settings');
  });
  A('/act/botkey', (req, res) => { const a = cur(req); if (a) run('UPDATE apps SET botkey=? WHERE id=?', 'bot_' + rnd(24), a.id); res.redirect('/app/botkey'); });
  A('/act/:k/bulk', (req, res) => {
    const a = cur(req), k = req.params.k, T = k == 'licenses' ? 'keys' : 'users', { act } = req.body, d = parseFloat(req.body.days) || 0;
    if (!a || !['licenses', 'users', 'sessions'].includes(k)) return res.sendStatus(404);
    const ids = [].concat(req.body.ids || []).map(Number).filter(Boolean);
    const sel = ids.length ? qa(`SELECT * FROM ${T} WHERE app_id=? AND id IN (${ids.map(() => '?').join()})`, a.id, ...ids) : [];
    if (act == 'export') { res.set({ 'Content-Type': 'text/plain', 'Content-Disposition': `attachment; filename=${k}.txt` }); return res.send(sel.map(r => r.key || r.username).join('\n')); }
    for (const r of sel) {
      if (k == 'sessions') run('UPDATE users SET last_login=0 WHERE id=?', r.id);
      else if (act == 'delete') run(`DELETE FROM ${T} WHERE id=?`, r.id);
      else if (act == 'addtime' && k == 'licenses') { run('UPDATE keys SET days=MAX(1,days+?) WHERE id=?', d, r.id); if (r.used_by) run('UPDATE users SET expires=expires+? WHERE app_id=? AND username=?', d * 86400, a.id, r.used_by); }
      else if (act == 'addtime') run('UPDATE users SET expires=MAX(?,expires)+? WHERE id=?', now(), d * 86400, r.id);
      else if (act == 'resethwid') run('UPDATE users SET hwid=NULL WHERE id=?', r.id);
      else if (act == 'ban') run('UPDATE users SET banned=1-banned WHERE id=?', r.id);
    }
  });

  // ---------- API para o bot do Discord ----------
  const bot = (req, res, fn) => {
    const a = q1('SELECT * FROM apps WHERE botkey=?', String(req.body?.botkey || ''));
    if (!a) return res.status(401).json({ success: false, message: 'invalid bot key' });
    try { res.json({ success: true, ...fn(a, req.body) }); } catch { res.json({ success: false, message: 'error' }); }
  };
  app.post('/api/bot/keys', (req, res) => bot(req, res, (a, b) => ({ keys: mk(a, Math.min(100, +b.amount || 1), Math.max(1 / 24, +b.days || 30), b.mask, false, true, b.note) })));
  app.post('/api/bot/users', (req, res) => bot(req, res, (a, b) => {
    if (!b.username) throw 0; const pw = String(b.password || rnd(5));
    run('INSERT INTO users(app_id,username,pass_hash,expires) VALUES(?,?,?,?)', a.id, String(b.username).slice(0, 40), bcrypt.hashSync(pw, 10), now() + Math.floor((+b.days || 30) * 86400));
    return { username: b.username, password: pw };
  }));
  app.post('/api/bot/addtime', (req, res) => bot(req, res, (a, b) => {
    const d = +b.days || 0, v = String(b.value);
    if (b.target == 'key') { const k = q1('SELECT * FROM keys WHERE app_id=? AND key=?', a.id, v); if (!k) throw 0; run('UPDATE keys SET days=MAX(1,days+?) WHERE id=?', d, k.id); if (k.used_by) run('UPDATE users SET expires=expires+? WHERE app_id=? AND username=?', d * 86400, a.id, k.used_by); }
    else run('UPDATE users SET expires=MAX(?,expires)+? WHERE app_id=? AND username=?', now(), d * 86400, a.id, v);
    return {};
  }));
};
