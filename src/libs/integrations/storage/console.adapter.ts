import { mkdir, readFile, rm, writeFile } from "fs/promises"
import { tmpdir } from "os"
import { dirname, join, resolve, sep } from "path"
import type { IStorageService, UploadFileParams, UploadFileResult } from "@/libs/integrations/storage/storage.interface"
import { createLogger } from "@/libs/utils/logger"

const logger = createLogger("fake-storage")

const BASE_DIR = join(tmpdir(), "pulse-local-storage")

function resolveStoragePath(key: string): string {
  const target = resolve(BASE_DIR, key)
  if (target !== BASE_DIR && !target.startsWith(`${BASE_DIR}${sep}`)) {
    throw new Error("Chave de storage inválida.")
  }
  return target
}

export class ConsoleStorageAdapter implements IStorageService {
  async upload(params: UploadFileParams): Promise<UploadFileResult> {
    const filePath = resolveStoragePath(params.path)
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, Buffer.from(await params.file.arrayBuffer()))
    logger.info("upload", { key: params.path, size: params.file.size })
    return { url: params.path, key: params.path }
  }

  download(key: string): Promise<Buffer> {
    return readFile(resolveStoragePath(key))
  }

  async delete(key: string): Promise<void> {
    await rm(resolveStoragePath(key), { force: true })
    logger.info("delete", { key })
  }

  getUrl(key: string): Promise<string> {
    logger.info("getUrl", { key })
    return Promise.resolve(`http://localhost:3000/fake-storage/${key}`)
  }
}
