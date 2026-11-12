import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { existsSync, readdirSync, unlinkSync } from 'node:fs';
import { addFollowup, backupDatabase, createContact, createOpportunity, createPartner, deleteContact, deleteOpportunity, deletePartner, getContact, getOpportunity, getPartner, importPartners, listContacts, listOpportunities, listPartners, moveContact, resetBusinessData, saveScores, updateContact, updateOpportunity, updatePartner } from './db';
import { changePassword, clearSessionCookie, createSession, ensureAdmin, loginBlocked, recordLogin, removeSession, requireAuth, setSessionCookie, verifyLogin, verifyUserPassword } from './auth';

const app = express();
const port = Number(process.env.PORT || 3001);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
ensureAdmin();

app.get('/api/health', (_req, res) => res.json({ ok: true, service: '渠成 Channel OS' }));
app.post('/api/auth/login', (req, res) => {
  const key = req.ip || req.socket.remoteAddress || 'local';
  if (loginBlocked(key)) return res.status(429).json({ error: '登录尝试过多，请 15 分钟后重试' });
  const user = verifyLogin(String(req.body.username || ''), String(req.body.password || ''));
  recordLogin(key, Boolean(user));
  if (!user) return res.status(401).json({ error: '账号或密码不正确' });
  setSessionCookie(res, createSession(user.id));
  res.json({ user });
});
app.get('/api/auth/me', requireAuth, (_req, res) => res.json({ user: res.locals.user }));
app.post('/api/auth/logout', requireAuth, (_req, res) => {
  removeSession(res.locals.sessionToken);
  clearSessionCookie(res);
  res.json({ ok: true });
});
app.use('/api', requireAuth);

app.post('/api/auth/password', (req, res) => {
  changePassword(res.locals.user.id, res.locals.sessionToken, String(req.body.currentPassword || ''), String(req.body.newPassword || ''));
  res.json({ ok: true });
});
app.post('/api/admin/reset-data', (req, res) => {
  if (!verifyUserPassword(res.locals.user.id, String(req.body.password || ''))) return res.status(400).json({ error: '管理员密码不正确，未清除任何数据' });
  if (req.body.confirmation !== '清空') return res.status(400).json({ error: '请输入「清空」确认操作' });
  resetBusinessData();
  const backupDir = path.resolve('data', 'backups');
  if (existsSync(backupDir)) {
    readdirSync(backupDir).filter((file) => file.endsWith('.db')).forEach((file) => {
      const target = path.resolve(backupDir, file);
      if (path.dirname(target) !== backupDir) throw new Error('备份文件路径校验失败');
      unlinkSync(target);
    });
  }
  res.json({ ok: true, partners: 0, opportunities: 0, contacts: 0 });
});
app.get('/api/partners', (_req, res) => res.json(listPartners()));
app.get('/api/partners/:id', (req, res) => {
  const partner = getPartner(req.params.id);
  if (!partner) return res.status(404).json({ error: '伙伴不存在' });
  res.json(partner);
});
app.post('/api/partners', (req, res) => res.status(201).json(createPartner(req.body)));
app.put('/api/partners/:id', (req, res) => res.json(updatePartner(req.params.id, req.body)));
app.delete('/api/partners/:id', (req, res) => { deletePartner(req.params.id); res.json({ ok: true }); });
app.put('/api/partners/:id/scores', (req, res) => res.json(saveScores(req.params.id, req.body.scores || {})));
app.post('/api/partners/:id/followups', (req, res) => res.status(201).json(addFollowup(req.params.id, req.body)));
app.post('/api/import', (req, res) => {
  if (!Array.isArray(req.body.partners)) return res.status(400).json({ error: '导入数据格式不正确' });
  res.json(importPartners(req.body.partners));
});
app.post('/api/backup', (_req, res) => res.status(201).json({ file: backupDatabase() }));
app.get('/api/opportunities', (_req, res) => res.json(listOpportunities()));
app.get('/api/opportunities/:id', (req, res) => {
  const opportunity = getOpportunity(req.params.id);
  if (!opportunity) return res.status(404).json({ error: '记录不存在' });
  res.json(opportunity);
});
app.post('/api/opportunities', (req, res) => res.status(201).json(createOpportunity(req.body)));
app.put('/api/opportunities/:id', (req, res) => res.json(updateOpportunity(req.params.id, req.body)));
app.delete('/api/opportunities/:id', (req, res) => { deleteOpportunity(req.params.id); res.json({ ok: true }); });
app.get('/api/contacts', (_req, res) => res.json(listContacts()));
app.get('/api/contacts/:id', (req, res) => {
  const contact = getContact(req.params.id);
  if (!contact) return res.status(404).json({ error: '联系人不存在' });
  res.json(contact);
});
app.post('/api/contacts', (req, res) => res.status(201).json(createContact(req.body)));
app.put('/api/contacts/:id', (req, res) => res.json(updateContact(req.params.id, req.body)));
app.post('/api/contacts/:id/move', (req, res) => res.json(moveContact(req.params.id, req.body)));
app.delete('/api/contacts/:id', (req, res) => { deleteContact(req.params.id); res.json({ ok: true }); });

app.use('/api', (_req, res) => res.status(404).json({ error: '接口不存在' }));
const dist = path.resolve('dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}
app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  const message = error.message.includes('UNIQUE constraint failed') ? '该公司已存在，请勿重复创建' : error.message || '服务器错误';
  res.status(400).json({ error: message });
});

app.listen(port, '0.0.0.0', () => console.log(`渠成 Channel OS: http://localhost:${port}`));
setInterval(() => {
  try { console.log(`每日备份完成: ${backupDatabase()}`); } catch (error) { console.error('每日备份失败', error); }
}, 86400000).unref();
