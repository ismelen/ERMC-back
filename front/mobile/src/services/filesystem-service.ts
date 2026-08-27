import { pick, pickDirectory, types } from '@react-native-documents/picker';
import { Directory, File } from 'expo-file-system';
import { TransactionSource } from '../models/transaction-source';

export class FilesystemService {
  static async pickFolder(): Promise<[TransactionSource, TransactionSource[]] | undefined> {
    try {
      const dir = await pickDirectory();
      if (!dir || !dir.uri) return;

      const source: TransactionSource = {
        name: decodeURIComponent(dir.uri).split('/').pop() ?? '',
        src: dir.uri,
      };

      return [source, await FilesystemService.filesFromFolder(dir.uri)];
    } catch {
      return;
    }
  }

  static async filesFromFolder(uri: string): Promise<TransactionSource[]> {
    try {
      const files = new Directory(uri).list();

      const sources: TransactionSource[] = [];

      files.forEach((file) => {
        if (file instanceof Directory) return;
        sources.push({
          name: file.name,
          src: file.uri,
          size: file.size,
          mime: file.type,
        });
      });

      return sources;
    } catch {
      return [];
    }
  }

  static async pickFiles(allowedTypes?: string[]): Promise<TransactionSource[] | undefined> {
    try {
      const files = await pick({
        allowMultiSelection: true,
        type: allowedTypes ?? [types.allFiles],
      });

      if (!files || files.length === 0) return;

      return files.map(
        (file) =>
          ({
            name: file.name,
            src: file.uri,
            size: file.size,
            mime: file.type,
          }) as TransactionSource
      );
    } catch {
      return;
    }
  }

  static async deleteFile(path: string) {
    new File(path).delete();
  }
}
