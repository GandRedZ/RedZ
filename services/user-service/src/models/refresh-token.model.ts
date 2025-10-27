import { getDb } from "../database";

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  device_info?: string | null;
  ip_address?: string | null;
  created_at: Date;
  updated_at?: Date | null;
}

export class RefreshTokenModel {
  private static readonly table = "refresh_tokens";

  /**
   * Create refresh token
   */
  static async create(
    userId: string,
    token: string,
    expiresAt: Date,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<RefreshToken> {
    const [refreshToken] = await getDb()
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt,
        device_info: deviceInfo,
        ip_address: ipAddress,
      })
      .into(this.table)
      .returning("*");

    return refreshToken;
  }

  /**
   * Find token by value
   */
  static async findByToken(token: string): Promise<RefreshToken | null> {
    const refreshToken = await getDb()
      .select("*")
      .from(this.table)
      .where({ token })
      .where("expires_at", ">", getDb().fn.now())
      .first();

    return refreshToken || null;
  }

  /**
   * Delete token
   */
  static async delete(token: string): Promise<void> {
    await getDb().delete().from(this.table).where({ token });
  }

  /**
   * Delete all tokens for user
   */
  static async deleteByUserId(userId: string): Promise<void> {
    await getDb().delete().from(this.table).where({ user_id: userId });
  }

  /**
   * Delete expired tokens
   */
  static async deleteExpired(): Promise<void> {
    await getDb()
      .delete()
      .from(this.table)
      .where("expires_at", "<", getDb().fn.now());
  }

  /**
   * Get user tokens
   */
  static async findByUserId(userId: string): Promise<RefreshToken[]> {
    return getDb()
      .select("*")
      .from(this.table)
      .where({ user_id: userId })
      .where("expires_at", ">", getDb().fn.now())
      .orderBy("created_at", "desc");
  }
}
