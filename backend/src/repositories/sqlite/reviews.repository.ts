import type { openDatabase } from "../../db/connection.ts";
import type { Review, ReviewsRepository } from "../ports.ts";

type DatabaseConnection = ReturnType<typeof openDatabase>;

type ReviewRow = {
  id: string;
  job_id: string;
  client_id: string;
  provider_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    jobId: row.job_id,
    clientId: row.client_id,
    providerId: row.provider_id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

export class SqliteReviewsRepository implements ReviewsRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async list(): Promise<Review[]> {
    const rows = this.db.prepare("SELECT * FROM reviews ORDER BY created_at DESC, id ASC").all() as ReviewRow[];
    return rows.map(toReview);
  }
}
