import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CursosService {
  private apiUrl = 'http://api.185.182.9.69.nip.io/api/cursos';

  constructor(private http: HttpClient) { }

  listarCursos(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  crearCurso(curso: any): Observable<any> {
    return this.http.post(this.apiUrl, curso);
  }

  actualizarCurso(id: number, curso: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, curso);
  }

  eliminarCurso(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}