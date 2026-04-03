import crypto from 'crypto';

export function hashPassword(plaintext) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(plaintext, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve({ hash: key.toString('hex'), salt });
    });
  });
}

export function verifyPassword(plaintext, hash, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(plaintext, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(key.toString('hex') === hash);
    });
  });
}
