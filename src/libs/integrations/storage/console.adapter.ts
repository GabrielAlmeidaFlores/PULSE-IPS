import type { IStorageService, UploadFileParams, UploadFileResult } from "@/libs/integrations/storage/storage.interface"
import { createLogger } from "@/libs/utils/logger"

const logger = createLogger("fake-storage")

export class ConsoleStorageAdapter implements IStorageService {
  upload(params: UploadFileParams): Promise<UploadFileResult> {
    logger.info("upload", { key: params.path, size: params.file.size })
    return Promise.resolve({ url: params.path, key: params.path })
  }

  delete(key: string): Promise<void> {
    logger.info("delete", { key })
    return Promise.resolve()
  }

  getUrl(key: string): Promise<string> {
    logger.info("getUrl", { key })
    return Promise.resolve(`http://localhost:3000/fake-storage/${key}`)
  }
}
