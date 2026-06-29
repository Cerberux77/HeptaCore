import { del, head, put, type PutBlobResult } from "@vercel/blob";

export type AssetStorageUpload = {
  pathname: string;
  body: Blob | ArrayBuffer | Buffer | ReadableStream;
  contentType: string;
  sizeBytes?: number;
};

export type AssetStorageUploadResult = {
  url: string;
  pathname: string;
  etag?: string | null;
};

export type AssetStorageHeadResult = {
  exists: boolean;
  url?: string;
  pathname?: string;
  size?: number;
  uploadedAt?: Date;
};

export interface AssetStorageAdapter {
  upload(input: AssetStorageUpload): Promise<AssetStorageUploadResult>;
  delete(pathname: string): Promise<void>;
  head(pathname: string): Promise<AssetStorageHeadResult>;
  exists(pathname: string): Promise<boolean>;
}

function mapPutResult(result: PutBlobResult): AssetStorageUploadResult {
  return {
    url: result.url,
    pathname: result.pathname,
    etag: "contentDisposition" in result ? null : null,
  };
}

export class VercelBlobAssetStorage implements AssetStorageAdapter {
  async upload(input: AssetStorageUpload): Promise<AssetStorageUploadResult> {
    const blob = await put(input.pathname, input.body, {
      access: "public",
      contentType: input.contentType,
      addRandomSuffix: false,
      allowOverwrite: false,
      multipart: (input.sizeBytes ?? 0) > 4.5 * 1024 * 1024,
    });
    return mapPutResult(blob);
  }

  async delete(pathname: string): Promise<void> {
    await del(pathname);
  }

  async head(pathname: string): Promise<AssetStorageHeadResult> {
    try {
      const result = await head(pathname);
      return {
        exists: true,
        url: result.url,
        pathname: result.pathname,
        size: result.size,
        uploadedAt: result.uploadedAt,
      };
    } catch {
      return { exists: false };
    }
  }

  async exists(pathname: string): Promise<boolean> {
    return (await this.head(pathname)).exists;
  }
}

let adapter: AssetStorageAdapter = new VercelBlobAssetStorage();

export function getAssetStorage(): AssetStorageAdapter {
  return adapter;
}

export function setAssetStorageForTests(next: AssetStorageAdapter): () => void {
  const previous = adapter;
  adapter = next;
  return () => {
    adapter = previous;
  };
}
