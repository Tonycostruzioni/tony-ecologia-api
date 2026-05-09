import type { UserDoc, BookingDoc, NoticeDoc } from './models.js';

export function userToDto(u: UserDoc) {
  return {
    id: String(u._id),
    ragioneSociale: u.ragioneSociale,
    email: u.email,
    telefono: u.telefono,
    isAdmin: u.isAdmin,
  };
}
export function bookingToDto(b: BookingDoc) {
  return {
    id: String(b._id),
    userId: String(b.userId),
    ragioneSociale: b.ragioneSociale,
    email: b.email,
    telefono: b.telefono,
    wasteType: b.wasteType,
    cerCode: b.cerCode,
    date: b.date,
    timeSlot: b.timeSlot,
    vehicle: b.vehicle,
    quantity: b.quantity,
    status: b.status,
    outcomeSeen: b.outcomeSeen,
    createdAt: b.createdAt.toISOString(),
  };
}
export function noticeToDto(n: NoticeDoc) {
  return {
    id: String(n._id),
    title: n.title,
    message: n.message,
    level: n.level,
    active: n.active,
    createdAt: n.createdAt.toISOString(),
  };
}
