import { getDb } from "../database";

type User = Record<string, any>;

type CreateUserDTO = {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
};

export class UserModel {
  private static readonly table = "users";

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    const user = await getDb()
      .select("*")
      .from(this.table)
      .where({ id })
      .whereNull("deleted_at")
      .first();

    return user || null;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const user = await getDb()
      .select("*")
      .from(this.table)
      .where({ email })
      .whereNull("deleted_at")
      .first();

    return user || null;
  }

  /**
   * Create new user
   */
  static async create(
    data: CreateUserDTO & { password_hash: string }
  ): Promise<User> {
    const [user] = await getDb()
      .insert({
        email: data.email,
        password_hash: data.password_hash,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role || "user",
      })
      .into(this.table)
      .returning("*");
    return user;
  }

  /**
   * Update user
   */
  static async update(
    id: string,
    data: Partial<CreateUserDTO>
  ): Promise<User | null> {
    const [user] = await getDb()
      .update({
        ...data,
        updated_at: getDb().fn.now(),
      })
      .from(this.table)
      .where({ id })
      .whereNull("deleted_at")
      .returning("*");

    return user || null;
  }
  /**
   * Update password
   */
  static async updatePassword(
    id: string,
    password_hash: string
  ): Promise<void> {
    await getDb()
      .update({
        password_hash,
        updated_at: getDb().fn.now(),
      })
      .from(this.table)
      .where({ id });
  }

  /**
   * Update last login
   */
  static async updateLastLogin(id: string): Promise<void> {
    await getDb()
      .update({
        last_login_at: getDb().fn.now(),
      })
      .from(this.table)
      .where({ id });
  }

  /**
   * Soft delete user
   */
  static async delete(id: string): Promise<void> {
    await getDb()
      .update({
        deleted_at: getDb().fn.now(),
      })
      .from(this.table)
      .where({ id });
  }

  /**
   * Set password reset token
   */
  static async setResetToken(
    email: string,
    token: string,
    expiresAt: Date
  ): Promise<void> {
    await getDb()
      .update({
        reset_password_token: token,
        reset_password_expires: expiresAt,
      })
      .from(this.table)
      .where({ email });
  }

  /**
   * Find user by reset token
   */
  static async findByResetToken(token: string): Promise<User | null> {
    const user = await getDb()
      .select("*")
      .from(this.table)
      .where({ reset_password_token: token })
      .where("reset_password_expires", ">", getDb().fn.now())
      .whereNull("deleted_at")
      .first();

    return user || null;
  }

  /**
   * Clear reset token
   */
  static async clearResetToken(id: string): Promise<void> {
    await getDb()
      .update({
        reset_password_token: null,
        reset_password_expires: null,
      })
      .from(this.table)
      .where({ id });
  }

  /**
   * Get all users (admin)
   */
  static async findAll(
    page = 1,
    limit = 20
  ): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;

    const [users, countResult] = await Promise.all([
      getDb()
        .select("*")
        .from(this.table)
        .whereNull("deleted_at")
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset),
      // cast the count result to a known shape so TypeScript recognizes the 'count' property
      getDb()
        .count("* as count")
        .from(this.table)
        .whereNull("deleted_at") as unknown as Promise<
        Array<{ count: string }>
      >,
    ]);

    return {
      users,
      total: Number.parseInt(countResult[0].count),
    };
  }
}
