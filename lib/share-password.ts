import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'crypto'

// Hash con scrypt + salt casuale, formato: scrypt$<salt hex>$<hash hex>
export function hashSharePassword(pw: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pw, salt, 32).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifySharePassword(pw: string, stored: string): boolean {
  try {
    if (stored.startsWith('scrypt$')) {
      const [, salt, hash] = stored.split('$')
      const calcolato = scryptSync(pw, salt, 32)
      const atteso = Buffer.from(hash, 'hex')
      return calcolato.length === atteso.length && timingSafeEqual(calcolato, atteso)
    }
    // Legacy: SHA-256 non salato (share creati prima del passaggio a scrypt)
    const calcolato = createHash('sha256').update(pw).digest()
    const atteso = Buffer.from(stored, 'hex')
    return calcolato.length === atteso.length && timingSafeEqual(calcolato, atteso)
  } catch {
    return false
  }
}
