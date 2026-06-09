declare module 'expo-file-system' {
  export const documentDirectory: string | null;
  export enum EncodingType {
    UTF8 = 'utf8',
    Base64 = 'base64',
  }
  export function writeAsStringAsync(
    fileUri: string,
    contents: string,
    options?: { encoding?: EncodingType }
  ): Promise<void>;
}

declare module 'expo-sharing' {
  export function isAvailableAsync(): Promise<boolean>;
  export function shareAsync(
    url: string,
    options?: { mimeType?: string; dialogTitle?: string; UTI?: string }
  ): Promise<void>;
}
