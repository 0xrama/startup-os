import { inflateRawSync } from "node:zlib";

export const DOCX_MAX_EXPANDED_BYTES = 8 * 1024 * 1024;

export const PDF_MAX_PAGES = 100;

// Validate actual inflated sizes before Mammoth allocates the whole archive.
// ZIP64, encrypted entries and unusual compression methods are not accepted.
export function validateDocxArchive(bytes: Buffer) {
  let end = bytes.length - 22;
  const minimum = Math.max(0, end - 65_535);

  while (end >= minimum && bytes.readUInt32LE(end) !== 0x06054b50) end--;

  if (end < minimum) throw new Error("Invalid DOCX archive");

  const entries = bytes.readUInt16LE(end + 10);
  let offset = bytes.readUInt32LE(end + 16);

  if (
    bytes.readUInt32LE(end + 4) !== 0 ||
    bytes.readUInt16LE(end + 8) !== entries ||
    end + 22 + bytes.readUInt16LE(end + 20) !== bytes.length ||
    offset + bytes.readUInt32LE(end + 12) !== end
  )
    throw new Error("Invalid DOCX directory bounds");

  if (entries > 256) throw new Error("DOCX contains too many entries");
  let expanded = 0;

  for (let entry = 0; entry < entries; entry++) {
    if (bytes.readUInt32LE(offset) !== 0x02014b50)
      throw new Error("Invalid DOCX directory");
    const flags = bytes.readUInt16LE(offset + 8);
    const method = bytes.readUInt16LE(offset + 10);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const expandedSize = bytes.readUInt32LE(offset + 24);
    const localOffset = bytes.readUInt32LE(offset + 42);

    if (flags & 1 || ![0, 8].includes(method))
      throw new Error("Unsupported DOCX encoding");
    expanded += expandedSize;

    if (expanded > DOCX_MAX_EXPANDED_BYTES)
      throw new Error("DOCX expands beyond the analysis limit");

    if (bytes.readUInt32LE(localOffset) !== 0x04034b50)
      throw new Error("Invalid DOCX entry");

    const start =
      localOffset +
      30 +
      bytes.readUInt16LE(localOffset + 26) +
      bytes.readUInt16LE(localOffset + 28);

    if (start + compressedSize > bytes.length)
      throw new Error("Invalid DOCX entry size");
    const data = bytes.subarray(start, start + compressedSize);

    const actualSize =
      method === 8
        ? inflateRawSync(data, { maxOutputLength: Math.max(1, expandedSize) })
            .length
        : data.length;

    if (actualSize !== expandedSize)
      throw new Error("Invalid DOCX expanded size");
    offset +=
      46 +
      bytes.readUInt16LE(offset + 28) +
      bytes.readUInt16LE(offset + 30) +
      bytes.readUInt16LE(offset + 32);
  }

  if (offset !== end) throw new Error("Invalid DOCX entry count");
}
