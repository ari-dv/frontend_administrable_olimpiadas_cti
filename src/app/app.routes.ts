import { Routes } from '@angular/router';
import { CursosComponent } from './pages/cursos/cursos';
import { InicioComponent } from './pages/inicio/inicio';
import { EstudiantesComponent } from './pages/estudiantes/estudiantes';
import { InscripcionesComponent } from './pages/inscripciones/inscripciones';

export const routes: Routes = [
  { path: 'inicio', component: InicioComponent },
  { path: 'cursos', component: CursosComponent },
  { path: 'estudiantes', component: EstudiantesComponent },
  { path: 'inscripciones', component: InscripcionesComponent },
  { path: '', redirectTo: '/inicio', pathMatch: 'full' } 
];