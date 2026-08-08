/**
 * Contraseñas filtradas frecuentes (≥12 caracteres o patrones triviales).
 * La política no exige mayúscula+número+símbolo (produce contraseñas peores);
 * en su lugar exige longitud y rechaza lo que aparece en todas las filtraciones.
 */
const COMMON = new Set<string>([
  '123456789012',
  '1234567890123',
  '12345678901234',
  '123456789012345',
  '111111111111',
  '000000000000',
  'password1234',
  'password12345',
  'password123456',
  'contraseña123',
  'contrasena123',
  'qwertyuiop12',
  'qwertyuiopas',
  'qwerty123456',
  'iloveyou1234',
  'adminadmin123',
  'administrador',
  'administrator',
  'welcome12345',
  'bienvenido123',
  'letmein12345',
  'dragondragon',
  'monkeymonkey',
  'sunshine1234',
  'princess1234',
  'football1234',
  'baseball1234',
  'superman1234',
  'passw0rd1234',
  'p@ssw0rd1234',
  'secretsecret',
  'changemenow1',
  'changeme1234',
  'temporal1234',
  'likekiri1234',
]);

export function isCommonPassword(password: string): boolean {
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return true;
  // Un solo carácter repetido o secuencias numéricas puras largas.
  if (/^(.)\1+$/.test(lower)) return true;
  if (/^\d+$/.test(lower) && ('1234567890123456789012345'.includes(lower) || '9876543210987654321098765'.includes(lower))) {
    return true;
  }
  return false;
}
