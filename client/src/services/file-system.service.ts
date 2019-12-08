import axios from 'axios';

export interface IFileSystemStats {
  available_space?: number;
}

class FileSystemService {
  public async fetchAvailableServerSpace() {
    return axios.get('/api/file-system/stats').then((res: any) => res.data as IFileSystemStats);
  }
}

export const fileSystemService = new FileSystemService();
