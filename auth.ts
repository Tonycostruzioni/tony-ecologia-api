import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { UserModel, type UserDoc } from './models.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tony-ecologia-default-secret-change-in-prod';
const TOKEN_TTL = '30d';

export type JwtPayload = { uid: string; email: string; isAdmin: boolean };

export function signToken(user: UserDoc): string {
  const payload: JwtPayload = { uid: String(user._id), email: user.email, isAdmin: user.isAdmin };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}
export function verifyToken(token: string): JwtPayload | null {
  try { return jwt.verify(token, JWT_SECRET) as JwtPayload; } catch { return null; }
}
export interface AuthedRequest extends Request { user?: UserDoc; }
export function requireAuth(adminOnly = false) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token mancante.' });
    const payload = verifyToken(header.slice(7));
    if (!payload) return res.status(401).json({ error: 'Token non valido.' });
    const user = await UserModel.findById(payload.uid);
    if (!user) return res.status(401).json({ error: 'Utente non trovato.' });
    if (adminOnly && !user.isAdmin) return res.status(403).json({ error: 'Accesso riservato agli amministratori.' });
    req.user = user;
    next();
  };
}
