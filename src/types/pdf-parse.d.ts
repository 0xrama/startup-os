declare module "pdf-parse" {
  export default function pdfParse(
    dataBuffer: Buffer,
    options?: { max?: number }
  ): Promise<{ text: string }>;
}
