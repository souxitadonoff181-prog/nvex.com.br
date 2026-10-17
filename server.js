require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { DatabaseSync } = require('node:sqlite'); // SQLite embutido no Node (sem compilar nada)
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const {
  DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, BASE_URL = 'http://localhost:3000',
  SESSION_SECRET = 'troque-isso', PORT = 3000,
} = process.env;

const PROD = process.env.NODE_ENV === 'production';
const DATA_DIR = process.env.DATA_DIR || '.';
require('fs').mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(require('path').join(DATA_DIR, 'data.db'));
db.exec('PRAGMA journal_mode = WAL');
db.transaction = fn => (...args) => {
  db.exec('BEGIN');
  try { const r = fn(...args); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
};
db.exec(`
CREATE TABLE IF NOT EXISTS sessions(sid TEXT PRIMARY KEY, data TEXT, expires INTEGER);
CREATE TABLE IF NOT EXISTS accounts(id INTEGER PRIMARY KEY, discord_id TEXT UNIQUE, name TEXT);
CREATE TABLE IF NOT EXISTS apps(id INTEGER PRIMARY KEY, account_id INTEGER, name TEXT, ownerid TEXT, secret TEXT);
CREATE TABLE IF NOT EXISTS keys(id INTEGER PRIMARY KEY, app_id INTEGER, key TEXT UNIQUE, days INTEGER, used_by TEXT);
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, app_id INTEGER, username TEXT, pass_hash TEXT,
  expires INTEGER, hwid TEXT, banned INTEGER DEFAULT 0, UNIQUE(app_id, username));
`);

// Sessões guardadas no SQLite (sobrevivem a reinícios)
class SqliteStore extends session.Store {
  get(sid, cb) {
    const r = db.prepare('SELECT data FROM sessions WHERE sid=? AND expires>?').get(sid, Date.now());
    cb(null, r ? JSON.parse(r.data) : null);
  }
  set(sid, sess, cb) {
    const exp = sess.cookie?.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 7 * 864e5;
    db.prepare('INSERT OR REPLACE INTO sessions(sid,data,expires) VALUES(?,?,?)').run(sid, JSON.stringify(sess), exp);
    cb(null);
  }
  destroy(sid, cb) { db.prepare('DELETE FROM sessions WHERE sid=?').run(sid); cb(null); }
}
setInterval(() => db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now()), 3600e3).unref();

if (PROD && SESSION_SECRET === 'troque-isso') { console.error('Defina um SESSION_SECRET forte.'); process.exit(1); }

const app = express();
app.set('trust proxy', 1); // atrás do proxy HTTPS da hospedagem
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(session({
  store: new SqliteStore(), secret: SESSION_SECRET, resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: 7 * 864e5 },
}));

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const now = () => Math.floor(Date.now() / 1000);
const rnd = n => crypto.randomBytes(n).toString('hex');
const page = (body) => `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>Painel</title><style>
body{font-family:system-ui;background:#0f1117;color:#e6e6e6;max-width:900px;margin:30px auto;padding:0 16px}
a{color:#7aa2ff}input,select,button{padding:8px;margin:3px;border-radius:6px;border:1px solid #333;background:#1a1d27;color:#fff}
button{background:#5865f2;border:0;cursor:pointer}.card{background:#161922;border:1px solid #262a36;border-radius:10px;padding:16px;margin:14px 0}
code{background:#000;padding:2px 6px;border-radius:4px;word-break:break-all}table{width:100%;border-collapse:collapse}td,th{padding:6px;border-bottom:1px solid #262a36;text-align:left}
</style>${body}`;

require('./ui')(app, db, { esc, now, rnd, bcrypt, PROD, BASE_URL, env: process.env });
const hook = (a, t) => { if (a.webhook) fetch(a.webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: t }) }).catch(() => {}); };

// ---------- API pública (usada pelo seu programa) ----------
// POST /api/1.0  JSON: { type, ownerid, secret, username, password, key, hwid }
const hits = new Map();
app.post('/api/1.0', (req, res) => {
  const ip = req.ip, h = (hits.get(ip) || []).filter(t => Date.now() - t < 60000);
  h.push(Date.now()); hits.set(ip, h);
  if (h.length > 60) return res.status(429).json({ success: false, message: 'muitas requisições' });

  const { type, ownerid, secret, username, password, key, hwid } = req.body || {};
  const a = db.prepare('SELECT * FROM apps WHERE ownerid=? AND secret=?').get(String(ownerid), String(secret));
  if (!a) return res.json({ success: false, message: 'aplicação inválida' });
  db.prepare('UPDATE apps SET last_seen=? WHERE id=?').run(now(), a.id);
  const fail = m => res.json({ success: false, message: m });
  if (a.paused) return fail('application is paused');

  if (type === 'init') return res.json({ success: true, message: 'ok', appName: a.name });

  if (type === 'register') {
    const k = db.prepare('SELECT * FROM keys WHERE app_id=? AND key=?').get(a.id, String(key));
    if (!k || k.used_by) return fail('key inválida ou já usada');
    if (!username || !password) return fail('dados faltando');
    try {
      db.transaction(() => {
        db.prepare('INSERT INTO users(app_id,username,pass_hash,expires,hwid) VALUES(?,?,?,?,?)')
          .run(a.id, String(username), bcrypt.hashSync(String(password), 10), now() + k.days * 86400, hwid || null);
        db.prepare('UPDATE keys SET used_by=? WHERE id=?').run(String(username), k.id);
      })();
    } catch { return fail('usuário já existe'); }
    hook(a, `🆕 Register: ${username}`);
    return res.json({ success: true, message: 'registrado' });
  }

  if (type === 'login') {
    const u = db.prepare('SELECT * FROM users WHERE app_id=? AND username=?').get(a.id, String(username));
    if (!u || !bcrypt.compareSync(String(password || ''), u.pass_hash)) return fail('usuário ou senha incorretos');
    if (u.banned) return fail('usuário banido');
    if (u.expires < now()) return fail('assinatura expirada');
    if (a.force_hwid && !hwid) return fail('HWID required');
    if (a.hwid_lock && u.hwid_lock && u.hwid && hwid && u.hwid !== hwid) return fail('HWID mismatch');
    db.prepare('UPDATE users SET last_login=? WHERE id=?').run(now(), u.id);
    if (!u.hwid && hwid) db.prepare('UPDATE users SET hwid=? WHERE id=?').run(hwid, u.id);
    hook(a, `✅ Login: ${u.username}`);
    return res.json({ success: true, message: 'logado', info: { username: u.username, expires: u.expires } });
  }

  if (type === 'license') { // login só com a key
    const k = db.prepare('SELECT * FROM keys WHERE app_id=? AND key=?').get(a.id, String(key));
    if (!k) return fail('key inválida');
    if (k.used_by) return fail('use login com usuário e senha');
    const name = String(key);
    db.transaction(() => {
      db.prepare('INSERT INTO users(app_id,username,pass_hash,expires,hwid) VALUES(?,?,?,?,?)')
        .run(a.id, name, bcrypt.hashSync(rnd(8), 10), now() + k.days * 86400, hwid || null);
      db.prepare('UPDATE keys SET used_by=? WHERE id=?').run(name, k.id);
    })();
    return res.json({ success: true, message: 'licença ativada' });
  }

  fail('tipo desconhecido');
});

app.get('/health', (req, res) => res.send('ok'));
app.listen(PORT, () => console.log(`Rodando em ${BASE_URL}`));
