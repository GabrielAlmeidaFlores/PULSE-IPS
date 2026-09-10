export interface UploadFileParams {
  file: File
  path: string
}

export interface UploadFileResult {
  url: string
  key: string
}

export interface IStorageService {
  upload(params: UploadFileParams): Promise<UploadFileResult>
  download(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  getUrl(key: string): Promise<string>
}
