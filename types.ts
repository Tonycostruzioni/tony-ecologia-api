export type BookingStatus = 'in_attesa' | 'confermato' | 'rifiutato';
export type WasteType =
  | 'carta_cartone' | 'plastica' | 'vetro' | 'legno' | 'metallo' | 'raee'
  | 'organico' | 'inerti' | 'rifiuti_misti' | 'spazzamento' | 'ingombranti' | 'altro';
export type TimeSlot = 'mattina' | 'pomeriggio';
export type VehicleType = 'furgone_daily' | 'motrice' | 'motrice_rimorchio' | 'vasca_bilico';
export type Quantity = 'fino_1' | 'da_1_a_5' | 'da_5_a_10' | 'oltre_10';
export type NoticeLevel = 'giallo' | 'blu' | 'rosso' | 'verde';
