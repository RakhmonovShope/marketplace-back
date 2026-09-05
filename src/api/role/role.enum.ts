/**
 * Tizim rollarining barqaror kodlari (`Role.code`).
 * Kod ichida rol `id` bo'yicha emas, shu kod bo'yicha topiladi —
 * seed'dagi UUID'ga bog'lanish yo'q.
 */
export enum ROLE_CODE {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
}
