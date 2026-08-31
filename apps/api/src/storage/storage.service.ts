import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Where job photos live.
 *
 * STORAGE_DRIVER=local (default): writes to disk under UPLOADS_DIR, served
 * back at /uploads/<key> (see ServeStaticModule in app.module.ts). Fine for
 * a single always-on server with a persistent disk - NOT fine on Heroku,
 * Railway, or any host with an ephemeral filesystem, since photos vanish on
 * every restart/deploy.
 *
 * STORAGE_DRIVER=s3: uploads to any S3-compatible bucket (AWS S3, Cloudflare
 * R2, etc - same API). Needs S3_BUCKET, S3_ENDPOINT (omit for real AWS S3),
 * S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_PUBLIC_URL_BASE
 * (the public base URL your bucket serves from - a custom domain, or R2's
 * r2.dev URL, or an S3/CloudFront URL). Callers only ever see the returned
 * `url`, so nothing else in the app cares which driver is active.
 */
@Injectable()
export class StorageService {
  private logger = new Logger(StorageService.name);
  private driver: string;
  private uploadsDir: string;
  private s3?: S3Client;
  private bucket?: string;
  private publicUrlBase?: string;

  constructor(private config: ConfigService) {
    this.driver = this.config.get<string>('STORAGE_DRIVER', 'local');
    this.uploadsDir = join(process.cwd(), this.config.get<string>('UPLOADS_DIR', 'uploads'));

    if (this.driver === 's3') {
      this.bucket = this.config.get<string>('S3_BUCKET');
      this.publicUrlBase = this.config.get<string>('S3_PUBLIC_URL_BASE');
      const endpoint = this.config.get<string>('S3_ENDPOINT'); // unset for real AWS S3
      if (!this.bucket || !this.publicUrlBase) {
        this.logger.warn('STORAGE_DRIVER=s3 but S3_BUCKET/S3_PUBLIC_URL_BASE are not set - uploads will fail');
      }
      this.s3 = new S3Client({
        region: this.config.get<string>('S3_REGION', 'auto'),
        endpoint,
        forcePathStyle: !!endpoint, // R2 and most non-AWS S3-compatible hosts need this
        credentials: {
          accessKeyId: this.config.get<string>('S3_ACCESS_KEY_ID', ''),
          secretAccessKey: this.config.get<string>('S3_SECRET_ACCESS_KEY', ''),
        },
      });
    }
  }

  async saveJobPhoto(jobId: string, file: Express.Multer.File): Promise<string> {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const key = `jobs/${jobId}/${safeName}`;

    if (this.driver === 's3') {
      await this.s3!.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
      return `${this.publicUrlBase!.replace(/\/$/, '')}/${key}`;
    }

    const dir = join(this.uploadsDir, 'jobs', jobId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, safeName), file.buffer);
    return `/uploads/jobs/${jobId}/${safeName}`;
  }
}
