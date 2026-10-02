/**
 * Guarda de rol compartida: solo cuentas club pueden tocar estas funciones.
 *
 * Vivía en `services/cohn/provision.ts` (BLE/GoPro) porque fue su único
 * consumidor al principio — un lugar raro para una guarda de rol genérica.
 * Se extrae acá (2026-10-02) porque `api/games.ts` (crear/cancelar partidas
 * como club) pasa a necesitarla también, sin relación con COHN.
 */
export interface ClubIdentity { id: string; isClub: boolean }

export function assertClub(user: ClubIdentity | null | undefined): asserts user is ClubIdentity {
  if (!user?.id || user.isClub !== true) throw new Error('Esta función está disponible solo para usuarios club.');
}
