import { type RESERVATION_METHOD } from 'src/stock/stock-options.constant';

export type ReservationMethod = (typeof RESERVATION_METHOD)[keyof typeof RESERVATION_METHOD];
