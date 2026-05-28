import type { Review, ReviewsRepository } from "../ports.ts";
import { DirectusClient } from "./client.ts";
import type { DirectusReview } from "./mappers.ts";
import { toReview } from "./mappers.ts";

export class DirectusReviewsRepository implements ReviewsRepository {
  constructor(private readonly client: DirectusClient) {}

  async list(): Promise<Review[]> {
    const rows = await this.client.list<DirectusReview>("reviews_ml", { limit: -1, sort: "-created_at,id" });
    return rows.map(toReview);
  }
}
