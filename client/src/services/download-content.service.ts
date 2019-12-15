import axios from 'axios';

// export interface IFileSystemStats {
//   available_space?: number;
// }

class DownloadContentService {
  public async downloadContent(type: 'shows' | 'movies', token: string) {
    return axios.post(`/api/checkout/${type}`, { token }).then((res: any) => res.data as any);
  }
}

export const downloadContentService = new DownloadContentService();
