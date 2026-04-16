import type { IStorageService, UploadFileParams, UploadFileResult } from "@/libs/integrations/storage/storage.interface"

export class ConsoleStorageAdapter implements IStorageService {
  async upload(params: UploadFileParams): Promise<UploadFileResult> {
    console.log(`[FAKE STORAGE] upload → key: ${params.path}, size: ${params.file.size}`)
    return { url: params.path, key: params.path }
  }

  async delete(key: string): Promise<void> {
    console.log(`[FAKE STORAGE] delete → key: ${key}`)
  }

  async getUrl(key: string): Promise<string> {
    console.log(`[FAKE STORAGE] getUrl → key: ${key}`)
    return `http://localhost:3000/fake-storage/${key}`
  }
}
