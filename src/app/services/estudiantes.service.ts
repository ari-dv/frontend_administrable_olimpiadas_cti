import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EstudiantesService {
  private apiUrl = 'http://185.182.9.69:8081/api/estudiantes';

  constructor(private http: HttpClient) { }

  listarEstudiantes(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  crearEstudiante(estudiante: any): Observable<any> {
    return this.http.post(this.apiUrl, estudiante);
  }

  actualizarEstudiante(id: number, estudiante: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, estudiante);
  }

  eliminarEstudiante(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}