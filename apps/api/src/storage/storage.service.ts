import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Where job photos live. Default driver ("local") writes to disk under
 * UPLOADS_DIR and is served back at /uploads/<key> (see ServeStaticModule in
 * app.module.ts). To move to S3/Cloudflare R2 later, add an "s3" branch here
 * that uploads the buffer and returns the public/CDN URL - nothing else in
 * the app needs to change since callers only ever see `url`.
 */
@Injectable()
export class StorageService {
  private uploadsDir: string;

  constructor(private config: ConfigService) {
    this.uploadsDir = join(process.cwd(), this.config.get<string>('UPLOADS_DIR', 'uploads'));
  }

  async saveJobPhoto(jobId: string, file: Express.Multer.File): Promise<string> {
    const dir = join(this.uploadsDir, 'jobs', jobId);
    await fs.mkdir(dir, { recursive: true });

    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const fullPath = join(dir, safeName);
    await fs.writeFile(fullPath, file.buffer);

    return `/uploads/jobs/${jobId}/${safeName}`;
  }
}
