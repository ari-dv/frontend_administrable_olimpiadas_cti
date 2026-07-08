import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GruposService {
  private apiUrl = 'http://185.182.9.69:8081/api/grupos';

  constructor(private http: HttpClient) { }

  listarGrupos(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  crearGrupo(grupo: any): Observable<any> {
    return this.http.post(this.apiUrl, grupo);
  }

  actualizarGrupo(id: number, grupo: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, grupo);
  }

  eliminarGrupo(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  listarPorCurso(cursoId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/curso/${cursoId}`);
  }
}