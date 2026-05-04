import { registerAs } from '@nestjs/config';

export interface MinioConfig {
  readonly accessKey: string;
  readonly bucket: string;
  readonly endpoint: string;
  readonly secretKey: string;
}

export const minioConfig = registerAs(
  'minio',
  (): MinioConfig => ({
    accessKey: process.env['MINIO_ACCESS_KEY'] ?? '',
    bucket: process.env['MINIO_BUCKET'] ?? 'photos',
    endpoint: process.env['MINIO_ENDPOINT'] ?? 'http://127.0.0.1:9000',
    secretKey: process.env['MINIO_SECRET_KEY'] ?? '',
  }),
);
