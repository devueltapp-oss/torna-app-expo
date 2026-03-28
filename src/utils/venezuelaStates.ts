export interface VenezuelaState {
  value: string;
  label: string;
}

export const VENEZUELA_STATES: VenezuelaState[] = [
  { value: 'amazonas', label: 'Amazonas' },
  { value: 'anzoategui', label: 'Anzoátegui' },
  { value: 'apure', label: 'Apure' },
  { value: 'aragua', label: 'Aragua' },
  { value: 'barinas', label: 'Barinas' },
  { value: 'bolivar', label: 'Bolívar' },
  { value: 'carabobo', label: 'Carabobo' },
  { value: 'cojedes', label: 'Cojedes' },
  { value: 'delta_amacuro', label: 'Delta Amacuro' },
  { value: 'distrito_capital', label: 'Distrito Capital' },
  { value: 'falcon', label: 'Falcón' },
  { value: 'guarico', label: 'Guárico' },
  { value: 'lara', label: 'Lara' },
  { value: 'merida', label: 'Mérida' },
  { value: 'miranda', label: 'Miranda' },
  { value: 'monagas', label: 'Monagas' },
  { value: 'nueva_esparta', label: 'Nueva Esparta' },
  { value: 'portuguesa', label: 'Portuguesa' },
  { value: 'sucre', label: 'Sucre' },
  { value: 'tachira', label: 'Táchira' },
  { value: 'trujillo', label: 'Trujillo' },
  { value: 'vargas', label: 'Vargas' },
  { value: 'yaracuy', label: 'Yaracuy' },
  { value: 'zulia', label: 'Zulia' },
];

/**
 * Obtiene el nombre capitalizado de un estado a partir de su valor
 * @param stateValue - El valor del estado (ej: "bolivar", "miranda")
 * @returns El nombre capitalizado del estado (ej: "Bolívar", "Miranda") o el valor original si no se encuentra
 */
export function getStateLabel(stateValue: string | null | undefined): string {
  if (!stateValue) return '';
  
  const state = VENEZUELA_STATES.find(s => s.value === stateValue);
  return state?.label || stateValue;
}

