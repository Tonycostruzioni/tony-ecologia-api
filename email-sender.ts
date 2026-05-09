import nodemailer from 'nodemailer';
import type { BookingDoc } from './models.js';

function getTransporter() {
  const host = process.env.SMTP_HOST || 'mail.tonyecologia.com';
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;
  const user = process.env.SMTP_USER || 'info@tonyecologia.com';
  const pass = process.env.SMTP_PASS || 'Lanzanosrl';
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host, port, secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

const FROM = process.env.SMTP_FROM || 'Tony Ecologia <info@tonyecologia.com>';

const WASTE: Record<string, string> = {
  carta_cartone: 'Carta e cartone', plastica: 'Plastica', vetro: 'Vetro',
  legno: 'Legno', metallo: 'Metallo', raee: 'RAEE', organico: 'Organico',
  inerti: 'Inerti', rifiuti_misti: 'Rifiuti misti', spazzamento: 'Spazzamento',
  ingombranti: 'Ingombranti', altro: 'Altro',
};
const VEH: Record<string, string> = {
  furgone_daily: 'Furgone / Daily', motrice: 'Motrice',
  motrice_rimorchio: 'Motrice e rimorchio', vasca_bilico: 'Vasca / Bilico',
};
const QTY: Record<string, string> = {
  fino_1: 'fino a 1 ton.', da_1_a_5: 'da 1 a 5 ton.',
  da_5_a_10: 'da 5 a 10 ton.', oltre_10: 'oltre 10 ton.',
};
const TS: Record<string, string> = {
  mattina: 'Mattina 07:30 - 12:00', pomeriggio: 'Pomeriggio 13:00 - 17:00',
};
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}

export async function sendBookingResultEmail(
  booking: BookingDoc, outcome: 'confermato' | 'rifiutato'
): Promise<void> {
  const accepted = outcome === 'confermato';
  const id = String(booking._id).slice(-6).toUpperCase();
  const subject = accepted
    ? `✅ Prenotazione ACCETTATA — #${id}`
    : `❌ Prenotazione RIFIUTATA — #${id}`;
  const text = `Gentile ${booking.ragioneSociale},

la sua richiesta di conferimento è stata ${accepted ? 'ACCETTATA ✅' : 'RIFIUTATA ❌'}.

DETTAGLI PRENOTAZIONE
─────────────────────
ID:          #${id}
Tipo rifiuto: ${WASTE[booking.wasteType] ?? booking.wasteType}
Codice CER:  ${booking.cerCode || '—'}
Data:        ${formatDate(booking.date)}
Fascia:      ${TS[booking.timeSlot] ?? booking.timeSlot}
Automezzo:   ${VEH[booking.vehicle] ?? booking.vehicle}
Quantità:    ${QTY[booking.quantity] ?? booking.quantity}

${
  accepted
    ? 'Si presenti presso il nostro impianto nella data e fascia oraria indicate. Ricordi di portare con sé tutta la documentazione necessaria.'
    : 'Per maggiori informazioni contatti il nostro ufficio. Può inviare una nuova richiesta dal portale in qualsiasi momento.'
}

Cordiali saluti,
Tony Ecologia — Portale Conferimenti`;
  const html = text.replace(/\n/g, '<br>');
  const t = getTransporter();
  if (!t) {
    console.log(`[EMAIL][DEV] To: ${booking.email} Subject: ${subject}`);
    return;
  }
  try {
    await t.sendMail({
      from: FROM, to: booking.email, subject, text,
      html: `<div style="font-family:Inter,Arial,sans-serif;font-size:14px;color:#1e293b">${html}</div>`,
    });
    console.log(`[EMAIL] Inviata a ${booking.email}: ${subject}`);
  } catch (err) {
    console.error('[EMAIL] Errore invio:', err);
  }
}
