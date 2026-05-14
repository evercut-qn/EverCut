import {
    AbortMultipartUploadCommand,
    CompleteMultipartUploadCommand,
    CreateMultipartUploadCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import r2Client from '../../config/r2.config.js';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

const PRESIGNED_UPLOAD_SIGNABLE_HEADERS = new Set(['content-type']);

class StorageProvider {
    constructor(client = r2Client, bucket = config.r2.bucket) {
        this.client = client;
        this.bucket = bucket;
    }

    async generateUploadUrl({ key, contentType, expiresIn = config.media.presignedUrlTtl }) {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
        });
        return getSignedUrl(this.client, command, {
            expiresIn,
            signableHeaders: PRESIGNED_UPLOAD_SIGNABLE_HEADERS,
        });
    }

    async generatePresignedPutUrl(key, contentType, expiresIn = config.media.presignedUrlTtl) {
        const url = await this.generateUploadUrl({ key, contentType, expiresIn });
        return {
            url,
            expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        };
    }

    async headObject(key) {
        return this.client.send(new HeadObjectCommand({
            Bucket: this.bucket,
            Key: key,
        }));
    }

    async getObjectRange(key, start, end) {
        const response = await this.client.send(new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Range: `bytes=${start}-${end}`,
        }));
        return Buffer.from(await response.Body.transformToByteArray());
    }

    async deleteObject(key) {
        if (!key) return;
        try {
            await this.client.send(new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }));
            logger.info('R2 object deleted', { key });
        } catch (err) {
            logger.warn('R2 delete failed', { key, error: err.message });
        }
    }

    async putObject(key, buffer, contentType, metadata = {}) {
        return this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            Metadata: metadata,
        }));
    }

    async createMultipartUpload(key, contentType) {
        const response = await this.client.send(new CreateMultipartUploadCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
        }));
        return response.UploadId;
    }

    async generatePresignedPartUrl(key, uploadId, partNumber, expiresIn = config.media.presignedUrlTtl) {
        const command = new UploadPartCommand({
            Bucket: this.bucket,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
        });
        const url = await getSignedUrl(this.client, command, { expiresIn });
        return {
            url,
            expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        };
    }

    async completeMultipartUpload(key, uploadId, parts) {
        return this.client.send(new CompleteMultipartUploadCommand({
            Bucket: this.bucket,
            Key: key,
            UploadId: uploadId,
            MultipartUpload: {
                Parts: parts.map((part) => ({
                    PartNumber: part.partNumber,
                    ETag: part.etag,
                })),
            },
        }));
    }

    async abortMultipartUpload(key, uploadId) {
        try {
            await this.client.send(new AbortMultipartUploadCommand({
                Bucket: this.bucket,
                Key: key,
                UploadId: uploadId,
            }));
            logger.info('Multipart upload aborted', { key, uploadId });
        } catch (err) {
            logger.warn('Multipart abort failed', { key, uploadId, error: err.message });
        }
    }
}

export default new StorageProvider();
