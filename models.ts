import mongoose, { Schema, type Model, type Document } from 'mongoose';

export interface UserDoc extends Document {
  _id: mongoose.Types.ObjectId;
  ragioneSociale: string;
  email: string;
  passwordHash: string;
  telefono?: string;
  isAdmin: boolean;
  createdAt: Date;
}
const userSchema = new Schema<UserDoc>({
  ragioneSociale: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  telefono: { type: String, trim: true },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
export const UserModel: Model<UserDoc> =
  mongoose.models.User || mongoose.model<UserDoc>('User', userSchema);

export interface BookingDoc extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  ragioneSociale: string; email: string; telefono: string;
  wasteType: string; cerCode: string;
  date: string; timeSlot: string;
  vehicle: string; quantity: string;
  status: 'in_attesa' | 'confermato' | 'rifiutato';
  outcomeSeen: boolean;
  createdAt: Date;
}
const bookingSchema = new Schema<BookingDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ragioneSociale: { type: String, required: true },
  email: { type: String, required: true },
  telefono: { type: String, required: true },
  wasteType: { type: String, required: true },
  cerCode: { type: String, default: '' },
  date: { type: String, required: true },
  timeSlot: { type: String, required: true },
  vehicle: { type: String, required: true },
  quantity: { type: String, required: true },
  status: { type: String, enum: ['in_attesa', 'confermato', 'rifiutato'], default: 'in_attesa', index: true },
  outcomeSeen: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});
export const BookingModel: Model<BookingDoc> =
  mongoose.models.Booking || mongoose.model<BookingDoc>('Booking', bookingSchema);

export interface NoticeDoc extends Document {
  _id: mongoose.Types.ObjectId;
  title: string; message: string;
  level: 'giallo' | 'blu' | 'rosso' | 'verde';
  active: boolean;
  createdAt: Date;
}
const noticeSchema = new Schema<NoticeDoc>({
  title: { type: String, required: true },
  message: { type: String, required: true },
  level: { type: String, enum: ['giallo', 'blu', 'rosso', 'verde'], required: true },
  active: { type: Boolean, default: true, index: true },
  createdAt: { type: Date, default: Date.now },
});
export const NoticeModel: Model<NoticeDoc> =
  mongoose.models.Notice || mongoose.model<NoticeDoc>('Notice', noticeSchema);
