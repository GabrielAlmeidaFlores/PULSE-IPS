import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { env } from "@/env"
import type { IStorageService, UploadFileParams, UploadFileResult } from "@/libs/integrations/storage/storage.interface"

const SIGNED_URL_EXPIRES_IN = 3600

export class S3Adapter implements IStorageService {
  private client: S3Client
  private bucket: string

  constructor() {
    this.client = new S3Client({
      region: env.AWS_REGION ?? "us-east-1",
      ...(env.AWS_ENDPOINT_URL !== undefined && {
        endpoint: env.AWS_ENDPOINT_URL,
        forcePathStyle: true,
      }),
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? "",
      },
    })
    this.bucket = env.AWS_S3_BUCKET ?? ""
  }

  async upload(params: UploadFileParams): Promise<UploadFileResult> {
    const buffer = Buffer.from(await params.file.arrayBuffer())
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.path,
        Body: buffer,
        ContentType: params.file.type || "application/octet-stream",
      }),
    )
    return { url: params.path, key: params.path }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  async download(key: string): Promise<Buffer> {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
    const body = response.Body
    if (body === undefined) throw new Error("Arquivo não encontrado no storage.")
    const bytes = await body.transformToByteArray()
    return Buffer.from(bytes)
  }

  getUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key })
    return getSignedUrl(this.client, command, { expiresIn: SIGNED_URL_EXPIRES_IN })
  }
}
