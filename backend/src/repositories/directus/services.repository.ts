import type { ProviderProfile, Service, ServicesRepository } from "../ports.ts";
import { DirectusClient } from "./client.ts";
import type { DirectusProviderProfile, DirectusService, DirectusUser } from "./mappers.ts";
import { toProviderProfile, toService, toUser } from "./mappers.ts";

export class DirectusServicesRepository implements ServicesRepository {
  constructor(private readonly client: DirectusClient) {}

  async findById(id: string): Promise<Service | null> {
    const row = await this.client.item<DirectusService>("services_ml", id);
    return row ? toService(row) : null;
  }

  async list(): Promise<Service[]> {
    const rows = await this.client.list<DirectusService>("services_ml", { sort: "name" });
    return rows.map(toService);
  }

  async listProviderProfiles(): Promise<ProviderProfile[]> {
    const [users, profiles] = await Promise.all([
      this.client.list<DirectusUser>("users_ml", { limit: -1 }),
      this.client.list<DirectusProviderProfile>("provider_profiles_ml", { limit: -1, sort: "-rating_average" }),
    ]);
    const usersById = new Map(users.map((row) => [row.id, toUser(row)]));

    return profiles.map((row) => toProviderProfile(row, usersById));
  }
}
