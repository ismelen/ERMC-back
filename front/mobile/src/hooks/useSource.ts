import { useState } from 'react';
import { FilesystemService } from '../services/filesystem-service';
import { TransactionSource } from '../models/transaction-source';

export function useSource(initFolder?: TransactionSource, initFiles?: TransactionSource[]) {
  const [folder, setFolder] = useState<TransactionSource | undefined>(initFolder);
  const [files, setFiles] = useState<TransactionSource[]>(initFiles ?? []);
  const [loading, setLoading] = useState(false);

  const addFiles = async () => {
    setLoading(true);
    const srcs = await FilesystemService.pickFiles();
    setLoading(false);

    if (!srcs || srcs.length === 0) return;
    setFiles([...files, ...srcs]);
  };

  const addFolder = async () => {
    setLoading(true);
    const res = await FilesystemService.pickFolder();
    setLoading(false);

    if (!res) return;
    const [newFolder, newFiles] = res;

    setFiles([...files, ...newFiles]);
    setFolder(newFolder);
  };

  const deleteSource = (idx: number) => {
    if (folder) {
      setFolder(undefined);
      setFiles([]);
      return;
    }

    setFiles(files.filter((_, i) => i !== idx));
  };

  return { folder, files, addFiles, addFolder, deleteSource, loading };
}
