import type { IStorageService, UploadFileParams, UploadFileResult } from "@/libs/integrations/storage/storage.interface"
import { createLogger } from "@/libs/utils/logger"

const logger = createLogger("fake-storage")

export class ConsoleStorageAdapter implements IStorageService {
  async upload(params: UploadFileParams): Promise<UploadFileResult> {
    logger.info("upload", { key: params.path, size: params.file.size })
    return { url: params.path, key: params.path }
  }

  async delete(key: string): Promise<void> {
    logger.info("delete", { key })
  }

  async getUrl(key: string): Promise<string> {
    logger.info("getUrl", { key })
    return `http://localhost:3000/fake-storage/${key}`
  }
}
