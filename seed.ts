import bcrypt from 'bcryptjs';
import { UserModel } from './models.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@tonyecologia.it';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Tonycostruzionisrl!1';

export async function seedAdmin(): Promise<void> {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const existing = await UserModel.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    existing.ragioneSociale = 'Tony Ecologia';
    existing.passwordHash = passwordHash;
    existing.isAdmin = true;
    await existing.save();
    console.log(`[SEED] Admin aggiornato: ${ADMIN_EMAIL}`);
  } else {
    await UserModel.create({
      ragioneSociale: 'Tony Ecologia',
      email: ADMIN_EMAIL.toLowerCase(),
      passwordHash, isAdmin: true,
    });
    console.log(`[SEED] Admin creato: ${ADMIN_EMAIL}`);
  }
}
