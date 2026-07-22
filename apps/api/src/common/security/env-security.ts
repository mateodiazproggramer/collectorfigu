function isWeak(value: string | undefined, weakValues: string[]) {
  return !value || weakValues.includes(value) || value.length < 32;
}

function hasPrefix(value: string | undefined, prefix: string) {
  return Boolean(value?.startsWith(prefix));
}

export function assertSecureEnvironment() {
  if (process.env.NODE_ENV !== 'production') return;

  const failures: string[] = [];
  const wompiEnv = process.env.WOMPI_ENV ?? 'production';
  if (isWeak(process.env.JWT_SECRET, ['dev-secret', 'change_me_super_secret'])) failures.push('JWT_SECRET fuerte');
  if (!['production', 'sandbox'].includes(wompiEnv)) failures.push('WOMPI_ENV production o sandbox');
  if (!process.env.WOMPI_PUBLIC_KEY?.startsWith('pub_')) failures.push('WOMPI_PUBLIC_KEY valida');
  if (!process.env.WOMPI_PRIVATE_KEY?.startsWith('prv_')) failures.push('WOMPI_PRIVATE_KEY valida');
  if (isWeak(process.env.WOMPI_INTEGRITY_SECRET, ['test_integrity_secret'])) failures.push('WOMPI_INTEGRITY_SECRET configurado');
  if (isWeak(process.env.WOMPI_EVENTS_SECRET, ['test_events_secret'])) failures.push('WOMPI_EVENTS_SECRET configurado');
  if (wompiEnv === 'production') {
    if (!hasPrefix(process.env.WOMPI_PUBLIC_KEY, 'pub_prod_')) failures.push('WOMPI_PUBLIC_KEY prod');
    if (!hasPrefix(process.env.WOMPI_PRIVATE_KEY, 'prv_prod_')) failures.push('WOMPI_PRIVATE_KEY prod');
    if (!hasPrefix(process.env.WOMPI_INTEGRITY_SECRET, 'prod_integrity_')) failures.push('WOMPI_INTEGRITY_SECRET prod');
    if (!hasPrefix(process.env.WOMPI_EVENTS_SECRET, 'prod_events_')) failures.push('WOMPI_EVENTS_SECRET prod');
  }
  if (wompiEnv === 'sandbox') {
    if (!hasPrefix(process.env.WOMPI_PUBLIC_KEY, 'pub_test_')) failures.push('WOMPI_PUBLIC_KEY test');
    if (!hasPrefix(process.env.WOMPI_PRIVATE_KEY, 'prv_test_')) failures.push('WOMPI_PRIVATE_KEY test');
    if (!hasPrefix(process.env.WOMPI_INTEGRITY_SECRET, 'test_integrity_')) failures.push('WOMPI_INTEGRITY_SECRET test');
    if (!hasPrefix(process.env.WOMPI_EVENTS_SECRET, 'test_events_')) failures.push('WOMPI_EVENTS_SECRET test');
  }
  if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN.includes('*')) failures.push('CORS_ORIGIN explicito');
  if (!process.env.CLOUDINARY_CLOUD_NAME) failures.push('CLOUDINARY_CLOUD_NAME');
  if (!process.env.CLOUDINARY_API_KEY) failures.push('CLOUDINARY_API_KEY');
  if (!process.env.CLOUDINARY_API_SECRET) failures.push('CLOUDINARY_API_SECRET');
  if (!process.env.FRONTEND_URL?.startsWith('https://')) failures.push('FRONTEND_URL https');
  if (!process.env.DATABASE_URL?.includes('postgresql://')) failures.push('DATABASE_URL PostgreSQL');

  if (failures.length) {
    throw new Error(`Configuracion insegura para produccion: ${failures.join(', ')}`);
  }
}
