import { createHash } from 'node:crypto';
import { EncryptJWT, jwtDecrypt } from 'jose';

const ALG = 'dir';
const ENC = 'A256GCM';

const keyOf = (secret: string): Uint8Array =>
  new Uint8Array(createHash('sha256').update(secret).digest());

/**
 * Encrypts and authenticates a cookie payload (JWE `dir` + A256GCM). The
 * browser can neither read nor alter it; expiry is enforced on read.
 */
export const seal = (
  payload: Record<string, unknown>,
  secret: string,
  maxAgeSeconds: number,
): Promise<string> =>
  new EncryptJWT(payload)
    .setProtectedHeader({ alg: ALG, enc: ENC })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .encrypt(keyOf(secret));

export const unseal = async (
  token: string,
  secret: string,
): Promise<Record<string, unknown> | null> => {
  try {
    const { payload } = await jwtDecrypt(token, keyOf(secret), {
      keyManagementAlgorithms: [ALG],
      contentEncryptionAlgorithms: [ENC],
    });
    return payload;
  } catch {
    return null;
  }
};

export const chunk = (value: string, size: number): string[] => {
  const parts: string[] = [];
  for (let i = 0; i < value.length; i += size)
    parts.push(value.slice(i, i + size));
  return parts;
};
