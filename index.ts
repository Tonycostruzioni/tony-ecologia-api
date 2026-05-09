import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserModel, BookingModel, NoticeModel } from './models.js';
import { signToken, requireAuth, type AuthedRequest } from './auth.js';
import { seedAdmin } from './seed.js';
import { sendBookingResultEmail } from './email-sender.js';
import { userToDto, bookingToDto, noticeToDto } from './dto-mappers.js';

const MONGO_URL =
  process.env.MONGO_URL ||
  'mongodb+srv://info_db_user:sGyzS1TpqdgoxEe4@cluster0.wjllzr7.mongodb.net/tony-ecologia?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
  await mongoose.connect(MONGO_URL);
  console.log('[DB] Connesso a MongoDB');
  await seedAdmin();

  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (_req, res) => res.json({ service: 'tony-ecologia-api', status: 'ok' }));
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'tony-ecologia', time: new Date().toISOString() });
  });

  // ======== AUTH ========
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { ragioneSociale, email, password, telefono } = req.body ?? {};
      if (!ragioneSociale?.trim() || !email?.trim() || !password) return res.status(400).json({ error: 'Dati mancanti.' });
      if (password.length < 4) return res.status(400).json({ error: 'La password deve avere almeno 4 caratteri.' });
      const lowerEmail = String(email).toLowerCase().trim();
      if (await UserModel.findOne({ email: lowerEmail })) {
        return res.status(409).json({ error: 'Esiste già un utente con questa email.' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await UserModel.create({
        ragioneSociale: ragioneSociale.trim(),
        email: lowerEmail, passwordHash,
        telefono: telefono?.trim() || undefined,
        isAdmin: false,
      });
      res.status(201).json({ token: signToken(user), user: userToDto(user) });
    } catch (err) { console.error('[register]', err); res.status(500).json({ error: 'Errore interno.' }); }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body ?? {};
      if (!email || !password) return res.status(400).json({ error: 'Email e password obbligatorie.' });
      const user = await UserModel.findOne({ email: String(email).toLowerCase().trim() });
      if (!user) return res.status(401).json({ error: 'Credenziali non valide.' });
      if (!(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ error: 'Credenziali non valide.' });
      }
      res.json({ token: signToken(user), user: userToDto(user) });
    } catch (err) { console.error('[login]', err); res.status(500).json({ error: 'Errore interno.' }); }
  });

  app.get('/api/auth/me', requireAuth(), async (req: AuthedRequest, res) => {
    res.json({ user: userToDto(req.user!) });
  });

  app.patch('/api/auth/me', requireAuth(), async (req: AuthedRequest, res) => {
    try {
      const { ragioneSociale, telefono, password } = req.body ?? {};
      const user = req.user!;
      if (typeof ragioneSociale === 'string' && ragioneSociale.trim()) user.ragioneSociale = ragioneSociale.trim();
      if (typeof telefono === 'string') user.telefono = telefono.trim() || undefined;
      if (typeof password === 'string' && password.length >= 4) {
        user.passwordHash = await bcrypt.hash(password, 10);
      }
      await user.save();
      res.json({ user: userToDto(user) });
    } catch (err) { console.error('[update me]', err); res.status(500).json({ error: 'Errore interno.' }); }
  });

  // ======== BOOKINGS ========
  app.get('/api/bookings', requireAuth(), async (req: AuthedRequest, res) => {
    try {
      const filter = req.user!.isAdmin ? {} : { userId: req.user!._id };
      const bookings = await BookingModel.find(filter).sort({ createdAt: -1 }).limit(500);
      res.json({ bookings: bookings.map(bookingToDto) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Errore.' }); }
  });

  app.post('/api/bookings', requireAuth(), async (req: AuthedRequest, res) => {
    try {
      const u = req.user!;
      const { ragioneSociale, email, telefono, wasteType, cerCode, date, timeSlot, vehicle, quantity } = req.body ?? {};
      if (!ragioneSociale || !email || !telefono || !wasteType || !date || !timeSlot || !vehicle || !quantity) {
        return res.status(400).json({ error: 'Dati prenotazione incompleti.' });
      }
      const booking = await BookingModel.create({
        userId: u._id, ragioneSociale, email, telefono,
        wasteType, cerCode: cerCode ?? '', date, timeSlot, vehicle, quantity,
        status: 'in_attesa', outcomeSeen: true,
      });
      res.status(201).json({ booking: bookingToDto(booking) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Errore.' }); }
  });

  app.patch('/api/bookings/:id/status', requireAuth(true), async (req, res) => {
    try {
      const { status } = req.body ?? {};
      if (status !== 'confermato' && status !== 'rifiutato') return res.status(400).json({ error: 'Stato non valido.' });
      const booking = await BookingModel.findById(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Prenotazione non trovata.' });
      booking.status = status; booking.outcomeSeen = false;
      await booking.save();
      sendBookingResultEmail(booking, status).catch((e) => console.error('[email]', e));
      res.json({ booking: bookingToDto(booking) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Errore.' }); }
  });

  app.post('/api/bookings/mark-seen', requireAuth(), async (req: AuthedRequest, res) => {
    try {
      await BookingModel.updateMany(
        { userId: req.user!._id, status: { $in: ['confermato', 'rifiutato'] } },
        { $set: { outcomeSeen: true } }
      );
      res.json({ ok: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Errore.' }); }
  });

  // ======== NOTICES ========
  app.get('/api/notices', requireAuth(), async (req: AuthedRequest, res) => {
    try {
      const filter = req.user!.isAdmin ? {} : { active: true };
      const notices = await NoticeModel.find(filter).sort({ createdAt: -1 });
      res.json({ notices: notices.map(noticeToDto) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Errore.' }); }
  });

  app.post('/api/notices', requireAuth(true), async (req, res) => {
    try {
      const { title, message, level } = req.body ?? {};
      if (!title?.trim() || !message?.trim() || !level) return res.status(400).json({ error: 'Dati avviso incompleti.' });
      const n = await NoticeModel.create({ title: title.trim(), message: message.trim(), level, active: true });
      res.status(201).json({ notice: noticeToDto(n) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Errore.' }); }
  });

  app.patch('/api/notices/:id', requireAuth(true), async (req, res) => {
    try {
      const updates: Record<string, unknown> = {};
      if (typeof req.body?.title === 'string') updates.title = req.body.title;
      if (typeof req.body?.message === 'string') updates.message = req.body.message;
      if (typeof req.body?.level === 'string') updates.level = req.body.level;
      if (typeof req.body?.active === 'boolean') updates.active = req.body.active;
      const n = await NoticeModel.findByIdAndUpdate(req.params.id, updates, { new: true });
      if (!n) return res.status(404).json({ error: 'Avviso non trovato.' });
      res.json({ notice: noticeToDto(n) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Errore.' }); }
  });

  app.delete('/api/notices/:id', requireAuth(true), async (req, res) => {
    try { await NoticeModel.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
    catch (err) { console.error(err); res.status(500).json({ error: 'Errore.' }); }
  });

  // ======== USERS (admin) ========
  app.get('/api/users', requireAuth(true), async (_req, res) => {
    try {
      const users = await UserModel.find({ isAdmin: { $ne: true } }).sort({ ragioneSociale: 1 }).limit(2000);
      res.json({ users: users.map(userToDto) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Errore.' }); }
  });

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`🚀  Tony Ecologia API ready on port ${port}`);
  });
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
