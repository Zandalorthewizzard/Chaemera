declare module "@electron/asar" {
  export function extractFile(archivePath: string, filePath: string): Buffer;
}
