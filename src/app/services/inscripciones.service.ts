import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InscripcionesService {
  private apiUrl = 'http://185.182.9.69:8080/api/inscripciones';

  constructor(private http: HttpClient) { }

  listarInscripciones(): Observable<any> {
    return this.http.get(`${this.apiUrl}?page=0&size=1000`);
  }

  crearInscripcion(inscripcion: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/inscribir`, inscripcion);
  }

  actualizarInscripcion(id: number, inscripcion: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, inscripcion);
  }

  eliminarInscripcion(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  listarPorGrupo(grupoId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/grupo/${grupoId}`);
  }

  listarPorEstudiante(estudianteId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/estudiante/${estudianteId}`);
  }
}