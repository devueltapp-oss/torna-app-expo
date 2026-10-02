let owner: symbol | null = null;
/** Bluetooth setup and UDP preview must not overlap, including asynchronous cleanup. */
export function acquireCameraControl(): () => void {
  if (owner) throw new Error('Esperá a que termine el enlace o se cierre el preview anterior.');
  const token = Symbol('camera'); owner = token;
  return () => { if (owner === token) owner = null; };
}
