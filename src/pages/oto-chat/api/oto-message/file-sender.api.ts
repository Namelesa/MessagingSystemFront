import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Observer, firstValueFrom } from 'rxjs';
import { environment } from '../../../../shared/api-urls';

export interface FileUrl {
  fileName: string;
  url: string;
}

@Injectable({ providedIn: 'root' })
export class FileUploadApiService {

  constructor(private http: HttpClient) {}

  async getUploadUrls(files: File[]): Promise<FileUrl[]> {
    const formData = new FormData();
    files.forEach(file => formData.append('File', file));
    
    return firstValueFrom(
      this.http.post<FileUrl[]>(`${environment.messagingApiUrl}get-load-file-url`, formData, { withCredentials: true })
    );
  }

  async uploadFileToS3(file: File, url: string): Promise<void> {
    const res = await fetch(url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type }
    });

    if (!res.ok) {
      throw new Error(`Upload failed for ${file.name}`);
    }
  }

  uploadFileWithProgress(file: File, url: string): { observable: Observable<number>; abort: () => void } {
    let xhr: XMLHttpRequest | null = null;

    const observable = new Observable<number>((observer: Observer<number>) => {
      xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      if (file.type) xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.onprogress = event => {
        if (event.lengthComputable) {
          observer.next(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr && xhr.status >= 200 && xhr.status < 300) {
          observer.next(100);
          observer.complete();
        } else {
          observer.error(new Error(`Upload failed: ${xhr?.status}`));
        }
      };

      xhr.onerror = () => observer.error(new Error('Network error during upload'));
      xhr.onabort = () => observer.error(new Error('Upload aborted'));

      xhr.send(file);
    });

    return {
      observable,
      abort: () => {
        if (xhr) {
          try { xhr.abort(); } catch {}
          xhr = null;
        }
      }
    };
  }

  async getDownloadUrls(fileNames: string[]): Promise<FileUrl[]> {
    let params = new HttpParams();
    fileNames.forEach(f => params = params.append('fileNames', f));
  
    const result = await firstValueFrom(
      this.http.get<FileUrl[]>(`${environment.messagingApiUrl}get-download-file-url`, {
        params,
        withCredentials: true
      })
    );
    
    return result;
  }
}
