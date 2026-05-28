import type { openDatabase } from "../../db/connection.ts";
import type { ProviderProfile, Service, ServicesRepository, User, UserRole } from "../ports.ts";

type DatabaseConnection = ReturnType<typeof openDatabase>;

type ServiceRow = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  base_price: number | null;
  icon: string | null;
};

type ProviderProfileRow = {
  id: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  avatar_url: string | null;
  city: string | null;
  rating: number;
  bio: string | null;
  service_categories: string;
  experience_years: number;
  verified_jobs_count: number;
  rating_average: number;
};

function toService(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    basePrice: row.base_price,
    icon: row.icon,
  };
}

function parseServiceCategories(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function toProviderProfile(row: ProviderProfileRow): ProviderProfile {
  const user: User = {
    id: row.user_id,
    name: row.user_name,
    role: row.user_role,
    avatarUrl: row.avatar_url,
    city: row.city,
    rating: row.rating,
  };

  return {
    id: row.id,
    user,
    bio: row.bio,
    serviceCategories: parseServiceCategories(row.service_categories),
    experienceYears: row.experience_years,
    verifiedJobsCount: row.verified_jobs_count,
    ratingAverage: row.rating_average,
  };
}

export class SqliteServicesRepository implements ServicesRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async findById(id: string): Promise<Service | null> {
    const row = this.db.prepare("SELECT * FROM services WHERE id = ?").get(id) as ServiceRow | undefined;
    return row ? toService(row) : null;
  }

  async list(): Promise<Service[]> {
    const rows = this.db.prepare("SELECT * FROM services ORDER BY name ASC").all() as ServiceRow[];
    return rows.map(toService);
  }

  async listProviderProfiles(): Promise<ProviderProfile[]> {
    const rows = this.db
      .prepare(
        `
          SELECT
            provider_profiles.id,
            provider_profiles.user_id,
            users.name AS user_name,
            users.role AS user_role,
            users.avatar_url,
            users.city,
            users.rating,
            provider_profiles.bio,
            provider_profiles.service_categories,
            provider_profiles.experience_years,
            provider_profiles.verified_jobs_count,
            provider_profiles.rating_average
          FROM provider_profiles
          JOIN users ON users.id = provider_profiles.user_id
          ORDER BY provider_profiles.rating_average DESC, users.name ASC
        `,
      )
      .all() as ProviderProfileRow[];

    return rows.map(toProviderProfile);
  }
}
