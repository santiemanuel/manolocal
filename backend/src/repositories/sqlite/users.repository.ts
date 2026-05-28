import type { openDatabase } from "../../db/connection.ts";
import type { User, UsersRepository, UserRole } from "../ports.ts";

type DatabaseConnection = ReturnType<typeof openDatabase>;

type UserRow = {
  id: string;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  city: string | null;
  rating: number;
};

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    avatarUrl: row.avatar_url,
    city: row.city,
    rating: row.rating,
  };
}

export class SqliteUsersRepository implements UsersRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async list(): Promise<User[]> {
    const rows = this.db.prepare("SELECT * FROM users ORDER BY name ASC").all() as UserRow[];
    return rows.map(toUser);
  }
}
