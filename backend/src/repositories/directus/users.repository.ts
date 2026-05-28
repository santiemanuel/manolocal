import type { UsersRepository } from "../ports.ts";
import { DirectusClient } from "./client.ts";
import type { DirectusUser } from "./mappers.ts";
import { toUser } from "./mappers.ts";

export class DirectusUsersRepository implements UsersRepository {
  constructor(private readonly client: DirectusClient) {}

  async list() {
    const rows = await this.client.list<DirectusUser>("users_ml", { sort: "name" });
    return rows.map(toUser);
  }
}
