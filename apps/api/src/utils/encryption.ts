import crypto from 'crypto';

// AES-256-GCM encryption settings
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // Initialization vector length
const TAG_LENGTH = 16; // Authentication tag length

// Validate encryption key
const validateKey = (key: string): Buffer => {
  if (!key) {
    throw new Error('Encryption key is required');
  }
  
  // If key is not exactly 32 bytes, derive it using PBKDF2
  if (key.length !== 64) { // 32 bytes = 64 hex characters
    // Use PBKDF2 to derive a 32-byte key from the provided key
    const salt = Buffer.from('bebrahma-salt', 'utf8'); // Static salt for consistency
    return crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
  }
  
  return Buffer.from(key, 'hex');
};

// Generate a random initialization vector
export const generateIV = (): Buffer => {
  return crypto.randomBytes(IV_LENGTH);
};

// Generate a secure random encryption key (for setup purposes)
export const generateEncryptionKey = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Encrypt data using AES-256-GCM
export const encrypt = (plaintext: string, key: string): { encryptedData: string; iv: string; tag: string } => {
  try {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Plaintext must be a non-empty string');
    }

    const keyBuffer = validateKey(key);
    const iv = generateIV();
    
    // Create cipher
    const cipher = crypto.createCipher(ALGORITHM, keyBuffer);
    cipher.setAutoPadding(true);
    
    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the authentication tag
    const tag = cipher.getAuthTag();
    
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

// Alternative encrypt function that combines IV and tag with encrypted data
export const encryptWithMetadata = (plaintext: string, key: string): { encryptedData: string; iv: string } => {
  try {
    const keyBuffer = validateKey(key);
    const iv = generateIV();
    
    const cipher = crypto.createCipher(ALGORITHM, keyBuffer);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // For simple cipher, no auth tag needed
    const combinedData = encrypted;
    
    return {
      encryptedData: combinedData,
      iv: iv.toString('hex'),
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

// Decrypt data using AES-256-GCM
export const decrypt = (encryptedData: string, iv: string, key: string, tag?: string): string => {
  try {
    if (!encryptedData || !iv) {
      throw new Error('Encrypted data and IV are required');
    }

    const keyBuffer = validateKey(key);
    const ivBuffer = Buffer.from(iv, 'hex');
    
    const decipher = crypto.createDecipher(ALGORITHM, keyBuffer);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data - data may be corrupted or key is incorrect');
  }
};

// Utility function to safely compare strings (prevent timing attacks)
export const safeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
};

// Hash a password using bcrypt-like approach with crypto
export const hashPassword = (password: string, salt?: string): { hash: string; salt: string } => {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, 100000, 64, 'sha256').toString('hex');
  
  return {
    hash,
    salt: actualSalt,
  };
};

// Verify a password against a hash
export const verifyPassword = (password: string, hash: string, salt: string): boolean => {
  const { hash: computedHash } = hashPassword(password, salt);
  return safeCompare(hash, computedHash);
};

// Create a secure token for API keys or session tokens
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('base64url');
};

// Mask sensitive data for logging (show only first and last few characters)
export const maskSensitiveData = (data: string, visibleChars: number = 4): string => {
  if (!data || data.length <= visibleChars * 2) {
    return '*'.repeat(8);
  }
  
  const start = data.substring(0, visibleChars);
  const end = data.substring(data.length - visibleChars);
  const middle = '*'.repeat(Math.max(8, data.length - visibleChars * 2));
  
  return `${start}${middle}${end}`;
};

// Test the encryption/decryption functionality
export const testEncryption = (key?: string): boolean => {
  try {
    const testKey = key || generateEncryptionKey();
    const testData = 'Hello, World! This is a test message for encryption.';
    
    console.log('Testing encryption...');
    console.log('Test data:', testData);
    
    const { encryptedData, iv } = encryptWithMetadata(testData, testKey);
    console.log('Encrypted data:', maskSensitiveData(encryptedData));
    console.log('IV:', iv);
    
    const decryptedData = decrypt(encryptedData, iv, testKey);
    console.log('Decrypted data:', decryptedData);
    
    const success = decryptedData === testData;
    console.log('Test result:', success ? 'PASS' : 'FAIL');
    
    return success;
  } catch (error) {
    console.error('Encryption test failed:', error);
    return false;
  }
};