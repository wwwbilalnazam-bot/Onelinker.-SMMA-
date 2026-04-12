// ════════════════════════════════════════════════════════════
// TOKEN VAULT — Secure Token Management
// Uses AES-256-GCM encryption for tokens stored in database
// ════════════════════════════════════════════════════════════

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY
  ? Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'base64')
  : null;

if (!ENCRYPTION_KEY) {
  console.warn(
    '[TokenVault] TOKEN_ENCRYPTION_KEY not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
  );
}

/**
 * TokenVault manages encryption/decryption of OAuth tokens
 * Uses AES-256-GCM for authenticated encryption
 */
export class TokenVault {
  /**
   * Encrypt a token for storage in database
   */
  static encrypt(plaintext: string): string {
    if (!ENCRYPTION_KEY) {
      throw new Error('TOKEN_ENCRYPTION_KEY not configured');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt a token from database
   */
  static decrypt(encryptedToken: string): string {
    if (!ENCRYPTION_KEY) {
      throw new Error('TOKEN_ENCRYPTION_KEY not configured');
    }

    const parts = encryptedToken.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }

    const [ivHex, authTagHex, ciphertext] = parts;

    try {
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Failed to decrypt token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Verify encryption key is configured
   */
  static isConfigured(): boolean {
    return !!ENCRYPTION_KEY;
  }

  /**
   * Get a token from social_accounts table (decrypted)
   */
  static async getAccessToken(
    supabase: any,
    workspaceId: string,
    accountId: string
  ): Promise<string> {
    const { data, error } = await supabase
      .from('social_accounts')
      .select('encrypted_access_token')
      .eq('workspace_id', workspaceId)
      .eq('outstand_account_id', accountId)
      .single();

    if (error) {
      throw new Error(`Failed to retrieve token: ${error.message}`);
    }

    if (!data?.encrypted_access_token) {
      throw new Error('No token found for account');
    }

    return this.decrypt(data.encrypted_access_token);
  }

  /**
   * Get a page access token (Meta-specific)
   */
  static async getPageAccessToken(
    supabase: any,
    workspaceId: string,
    accountId: string
  ): Promise<string> {
    const { data, error } = await supabase
      .from('social_accounts')
      .select('encrypted_page_access_token')
      .eq('workspace_id', workspaceId)
      .eq('outstand_account_id', accountId)
      .single();

    if (error) {
      throw new Error(`Failed to retrieve page token: ${error.message}`);
    }

    if (!data?.encrypted_page_access_token) {
      throw new Error('No page token found for account');
    }

    return this.decrypt(data.encrypted_page_access_token);
  }

  /**
   * Store an access token in social_accounts table (encrypted)
   */
  static async setAccessToken(
    supabase: any,
    workspaceId: string,
    accountId: string,
    token: string,
    expiresAt?: Date
  ): Promise<void> {
    const encrypted = this.encrypt(token);

    const { error } = await supabase
      .from('social_accounts')
      .update({
        encrypted_access_token: encrypted,
        token_expires_at: expiresAt?.toISOString(),
      })
      .eq('workspace_id', workspaceId)
      .eq('outstand_account_id', accountId);

    if (error) {
      throw new Error(`Failed to store token: ${error.message}`);
    }
  }

  /**
   * Store a page access token (Meta-specific)
   */
  static async setPageAccessToken(
    supabase: any,
    workspaceId: string,
    accountId: string,
    token: string,
    expiresAt?: Date
  ): Promise<void> {
    const encrypted = this.encrypt(token);

    const { error } = await supabase
      .from('social_accounts')
      .update({
        encrypted_page_access_token: encrypted,
        token_expires_at: expiresAt?.toISOString(),
      })
      .eq('workspace_id', workspaceId)
      .eq('outstand_account_id', accountId);

    if (error) {
      throw new Error(`Failed to store page token: ${error.message}`);
    }
  }
}
