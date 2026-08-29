import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { envConfig } from 'src/common/config';

export interface UploadedFile {
  /** Public (or public-read-configured) URL to store on the entity instead of raw bytes. */
  url: string;
  /** Bucket key — needed later to delete the object. */
  key: string;
}

/**
 * Uploads files (homework submissions, avatars, etc.) to S3-compatible object storage
 * instead of stuffing base64 into Postgres columns. Works with real AWS S3 or any
 * S3-compatible provider (Selectel, Yandex Object Storage, MinIO, Cloudflare R2) via
 * S3_ENDPOINT_URL — same convention already used by scripts/backup-db.sh.
 *
 * DEV FALLBACK: if S3_BUCKET isn't set, `isConfigured()` returns false and callers
 * (see HomeworkService) fall back to storing base64 directly in the DB, exactly like
 * before. This means the app keeps working with zero setup in local dev — S3 only
 * needs to be configured once you're ready for it in staging/production.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;

  constructor() {
    const { S3_BUCKET, S3_ENDPOINT_URL, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } =
      envConfig.STORAGE;

    this.bucket = S3_BUCKET;

    if (!S3_BUCKET) {
      this.client = null;
      return;
    }

    this.client = new S3Client({
      region: S3_REGION,
      // Faqat S3-mos xizmat (masalan Selectel/MinIO) uchun kerak — haqiqiy AWS S3
      // uchun bo'sh qoldirilsa, SDK standart AWS endpoint'ni ishlatadi.
      ...(S3_ENDPOINT_URL ? { endpoint: S3_ENDPOINT_URL, forcePathStyle: true } : {}),
      ...(S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY
        ? { credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY } }
        : {}),
    });
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * @param folder e.g. "homework", "avatars" — keeps the bucket organized
   * @param base64DataUrl a full data URL ("data:<mime>;base64,<data>") or bare base64 string
   */
  async uploadBase64(
    folder: string,
    filename: string,
    base64DataUrl: string,
  ): Promise<UploadedFile> {
    if (!this.client) {
      throw new Error('StorageService S3 uchun sozlanmagan (S3_BUCKET yo\'q)');
    }

    const match = /^data:([^;]+);base64,(.+)$/.exec(base64DataUrl);
    const contentType = match?.[1] ?? 'application/octet-stream';
    const base64 = match?.[2] ?? base64DataUrl;
    const buffer = Buffer.from(base64, 'base64');

    const key = `${folder}/${Date.now()}-${this.sanitizeFilename(filename)}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return { url: this.buildPublicUrl(key), key };
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err: any) {
      // Fayl allaqachon o'chirilgan yoki topilmasa ham davom etamiz — bu purge/cleanup
      // oqimini bloklashi shart emas.
      this.logger.warn(`S3 delete xatosi (${key}): ${err?.message ?? err}`);
    }
  }

  /** Reconstructs the S3 key from a URL previously returned by uploadBase64, for delete(). */
  keyFromUrl(url: string): string | null {
    const base = this.publicUrlPrefix();
    if (!url.startsWith(base)) return null;
    return url.slice(base.length).replace(/^\/+/, '');
  }

  private buildPublicUrl(key: string): string {
    return `${this.publicUrlPrefix()}/${key}`;
  }

  private publicUrlPrefix(): string {
    const { S3_PUBLIC_URL_BASE, S3_ENDPOINT_URL } = envConfig.STORAGE;
    if (S3_PUBLIC_URL_BASE) return S3_PUBLIC_URL_BASE.replace(/\/+$/, '');
    if (S3_ENDPOINT_URL) return `${S3_ENDPOINT_URL.replace(/\/+$/, '')}/${this.bucket}`;
    return `https://${this.bucket}.s3.${envConfig.STORAGE.S3_REGION}.amazonaws.com`;
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(-100);
  }
}
