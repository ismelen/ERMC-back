import { pick, pickDirectory, types } from '@react-native-documents/picker';
import { Source } from '../models/source';
import { Directory, File } from 'expo-file-system';

export class FilesystemService {
  static async pickFolder(): Promise<Source | undefined> {
    try {
      const dir = await pickDirectory();
      if (!dir || !dir.uri) return;

      const source: Source = {
        name: decodeURIComponent(dir.uri).split('/').pop() ?? '',
        path: dir.uri,
        children: await FilesystemService.filesFromFolder(dir.uri),
      };

      return source;
    } catch {
      return;
    }
  }

  static async filesFromFolder(uri: string): Promise<Source[]> {
    try {
      const files = new Directory(uri).list();

      const sources: Source[] = [];

      files.forEach((file) => {
        if (file instanceof Directory) return;
        sources.push({
          name: file.name,
          path: file.uri,
          size: file.size,
          mime: file.type,
        });
      });

      return sources;
    } catch {
      return [];
    }
  }

  static async pickFiles(): Promise<Source[] | undefined> {
    try {
      const files = await pick({
        allowMultiSelection: true,
        type: [types.allFiles],
      });

      if (!files || files.length === 0) return;

      return files.map(
        (file) =>
          ({
            name: file.name,
            path: file.uri,
            size: file.size,
            mime: file.type,
          }) as Source
      );
    } catch {
      return;
    }
  }

  static async deleteFile(path: string) {
    new File(path).delete();
  }
}
