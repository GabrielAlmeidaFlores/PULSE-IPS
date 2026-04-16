export interface GeneratePdfParams {
  title: string
  content: Record<string, string | number | boolean | null>
}

export interface GeneratePdfResult {
  buffer: Buffer
  filename: string
}

export interface IPdfService {
  generate(params: GeneratePdfParams): Promise<GeneratePdfResult>
}
