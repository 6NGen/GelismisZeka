/**
 * 04-TASARIM §1 — dal renk sırası.
 *
 * Dallara sırayla dağıtılır; dal sayısı diziyi aşarsa başa döner.
 * Mîzân çubuğunun kendi renkleri ayrıdır: tez = --red, karşı-düğüm = --green.
 */
export const COLORS = ["#8b2020", "#2a5a8b", "#1a6b6b", "#1a6b4a", "#6a2a8b", "#b8842a"];

export function branchColor(index: number): string {
  return COLORS[index % COLORS.length];
}

export const MIZAN_TEZ_COLOR = "#8b2020";
export const MIZAN_KARSI_COLOR = "#1a6b4a";

/** Etiket rozeti zemini: dal rengi + alfa (04-TASARIM §4.5). */
export function badgeBackground(color: string): string {
  return `${color}18`;
}
