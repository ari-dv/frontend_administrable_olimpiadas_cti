import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VpsService {
  private vpsUrl = 'http://185.182.9.69:3001';

  constructor(private http: HttpClient) {}

  // Sube el archivo físico al VPS
  subirImagen(archivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', archivo); // 'image' es el nombre del campo que suele esperar multer/Express en Node
    return this.http.post(`${this.vpsUrl}/upload-image`, formData);
  }
}