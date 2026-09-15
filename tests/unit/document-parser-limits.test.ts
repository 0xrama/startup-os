import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  DOCX_MAX_EXPANDED_BYTES,
  validateDocxArchive,
} from "@/lib/document-parser-limits";

function archive(text: string, declaredSize = Buffer.byteLength(text)) {
  const compressed = deflateRawSync(Buffer.from(text));
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50);
  const directory = Buffer.alloc(46);
  directory.writeUInt32LE(0x02014b50);
  directory.writeUInt16LE(8, 10);
  directory.writeUInt32LE(compressed.length, 20);
  directory.writeUInt32LE(declaredSize, 24);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(local.length + compressed.length, 16);

  return Buffer.concat([local, compressed, directory, end]);
}

describe("DOCX parser resource bounds", () => {
  it("accepts ordinary compressed entries", () => {
    expect(() =>
      validateDocxArchive(archive("<document>Text</document>"))
    ).not.toThrow();
  });

  it("rejects large declared expanded sizes before decompression", () => {
    expect(() =>
      validateDocxArchive(archive("text", DOCX_MAX_EXPANDED_BYTES + 1))
    ).toThrow("expands beyond");
  });

  it("also rejects compressed content that lies about its expanded size", () => {
    expect(() => validateDocxArchive(archive("x".repeat(10_000), 1))).toThrow();
  });

  it("rejects invalid archives", () => {
    expect(() => validateDocxArchive(Buffer.from("not a zip"))).toThrow();
  });

  it("does not let a forged entry count skip resource checks", () => {
    const bytes = archive("text");
    bytes.writeUInt16LE(0, bytes.length - 22 + 8);
    bytes.writeUInt16LE(0, bytes.length - 22 + 10);
    expect(() => validateDocxArchive(bytes)).toThrow("entry count");
  });

  it("rejects incorrect central directory bounds", () => {
    const bytes = archive("text");
    bytes.writeUInt32LE(0, bytes.length - 22 + 12);
    expect(() => validateDocxArchive(bytes)).toThrow("directory bounds");
  });
});
