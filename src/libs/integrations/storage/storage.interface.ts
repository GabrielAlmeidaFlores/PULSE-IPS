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
  delete(key: string): Promise<void>
  getUrl(key: string): Promise<string>
}
