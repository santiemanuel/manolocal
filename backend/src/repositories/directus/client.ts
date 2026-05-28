type DirectusListResponse<T> = {
  data: T[];
};

type DirectusItemResponse<T> = {
  data: T;
};

export type DirectusFile = {
  id: string;
  filename_download: string;
  type: string | null;
};

export class DirectusClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor() {
    this.baseUrl = (process.env.DIRECTUS_URL?.trim() || "https://cms.code-hello.com").replace(/\/$/, "");
    this.token = process.env.DIRECTUS_TOKEN?.trim() || "";

    if (!this.token) {
      throw new Error("DIRECTUS_TOKEN es requerido para usar DATA_ADAPTER=directus.");
    }
  }

  async list<T>(collection: string, params: Record<string, string | number | boolean> = {}): Promise<T[]> {
    const response = await this.request<DirectusListResponse<T>>("GET", `/items/${collection}`, undefined, params);
    return response.data;
  }

  async item<T>(collection: string, id: string, params: Record<string, string | number | boolean> = {}): Promise<T | null> {
    try {
      const response = await this.request<DirectusItemResponse<T>>("GET", `/items/${collection}/${id}`, undefined, params);
      return response.data;
    } catch (error) {
      if (error instanceof DirectusRequestError && error.status === 404) return null;
      throw error;
    }
  }

  async create<T>(collection: string, body: Record<string, unknown>): Promise<T> {
    const response = await this.request<DirectusItemResponse<T>>("POST", `/items/${collection}`, body);
    return response.data;
  }

  async update<T>(collection: string, id: string, body: Record<string, unknown>): Promise<T> {
    const response = await this.request<DirectusItemResponse<T>>("PATCH", `/items/${collection}/${id}`, body);
    return response.data;
  }

  async delete(collection: string, id: string): Promise<void> {
    await this.request<null>("DELETE", `/items/${collection}/${id}`);
  }

  async upsert<T>(collection: string, id: string, body: Record<string, unknown>): Promise<T> {
    try {
      return await this.create<T>(collection, body);
    } catch (error) {
      if (error instanceof DirectusRequestError && error.status === 400 && /already exists|duplicate/i.test(error.message)) {
        return this.update<T>(collection, id, body);
      }
      throw error;
    }
  }

  async system<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    params: Record<string, string | number | boolean> = {},
  ): Promise<T> {
    return this.request<T>(method, path, body, params);
  }

  async uploadFile(input: {
    buffer: Buffer;
    filename: string;
    title: string;
    type: string;
  }): Promise<DirectusFile> {
    const form = new FormData();
    form.set("title", input.title);
    form.set("filename_download", input.filename);
    form.set("file", new Blob([input.buffer as unknown as BlobPart], { type: input.type }), input.filename);

    const response = await this.requestForm<DirectusItemResponse<DirectusFile>>("POST", "/files", form);
    return response.data;
  }

  assetUrl(fileId: string): string {
    return `${this.baseUrl}/assets/${fileId}`;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    params: Record<string, string | number | boolean> = {},
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    const data = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      const message =
        data &&
        typeof data === "object" &&
        "errors" in data &&
        Array.isArray(data.errors) &&
        data.errors[0] &&
        typeof data.errors[0] === "object" &&
        "message" in data.errors[0] &&
        typeof data.errors[0].message === "string"
          ? data.errors[0].message
          : response.statusText;
      throw new DirectusRequestError(response.status, message);
    }

    return data as T;
  }

  private async requestForm<T>(method: string, path: string, body: FormData): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body,
    });
    const text = await response.text();
    const data = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      const message =
        data &&
        typeof data === "object" &&
        "errors" in data &&
        Array.isArray(data.errors) &&
        data.errors[0] &&
        typeof data.errors[0] === "object" &&
        "message" in data.errors[0] &&
        typeof data.errors[0].message === "string"
          ? data.errors[0].message
          : response.statusText;
      throw new DirectusRequestError(response.status, message);
    }

    return data as T;
  }
}

export class DirectusRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
