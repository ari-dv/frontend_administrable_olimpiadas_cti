import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DialogModule } from 'primeng/dialog'; 
import { TooltipModule } from 'primeng/tooltip';
import Swal from 'sweetalert2';

import { InscripcionesService } from '../../services/inscripciones.service';
import { EstudiantesService } from '../../services/estudiantes.service';
import { NuevaInscripcionComponent } from './nueva-inscripcion/nueva-inscripcion';

@Component({
  selector: 'app-inscripciones',
  standalone: true,
  imports: [
    CommonModule, TableModule, ButtonModule, TagModule, InputTextModule, 
    IconFieldModule, InputIconModule, DialogModule, ReactiveFormsModule, 
    TooltipModule, NuevaInscripcionComponent, SelectModule
  ],
  templateUrl: './inscripciones.html',
  styleUrls: ['./inscripciones.scss']
})
export class InscripcionesComponent implements OnInit {
  listaAgregadaestudiantes: any[] = []; 
  cargando: boolean = true;
  mostrarFormularioNuevo: boolean = false; 
  cursosFiltro: any[] = [];
  mostrarModalFoto: boolean = false;
  fotoForm: FormGroup;
  alumnoSeleccionadoParaFoto: any = null;
  cargandoFoto: boolean = false;
  filasPorPagina: number = window.innerWidth < 768 ? 3 : 10;

  @HostListener('window:resize')
  onResize() {
    this.filasPorPagina = window.innerWidth < 768 ? 3 : 10;
  }

  // Lógica manual que te funciona bien
  filasExpandidas: { [key: string]: boolean } = {};

  constructor(
    private inscripcionesService: InscripcionesService,
    private estudiantesService: EstudiantesService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder
  ) {
    this.fotoForm = this.fb.group({
      imagePath: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarInscripciones();
  }

  cargarInscripciones(): void {
    this.cargando = true;

    this.inscripcionesService.listarInscripciones().subscribe({
      next: (datos: any) => {
        const inscripcionesRaw = datos.content ? datos.content : datos;
        this.listaAgregadaestudiantes = this.agruparInscripciones(inscripcionesRaw);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar', err);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  agruparInscripciones(inscripciones: any[]): any[] {
    const mapa = new Map();
    const cursosSet = new Set<string>();

    inscripciones.forEach(ins => {
      // El backend puede devolver 'estudiante' o 'student'
      const est = ins.estudiante ?? ins.student;
      if (!est) return;

      // Normalizar: guardar siempre como 'estudiante' y 'grupo'
      if (!ins.estudiante && ins.student) ins.estudiante = ins.student;
      if (!ins.grupo && ins.group) ins.grupo = ins.group;

      // Normalizar el campo curso dentro del grupo
      const grupo = ins.grupo;
      if (grupo && !grupo.curso && grupo.course) {
        grupo.curso = grupo.course;
      }

      if (!mapa.has(est.id)) {
        mapa.set(est.id, {
          llaveFila: String(est.id), 
          estudiante: est,
          totalInscripciones: 0,
          detalles: [],
          nombresCursos: [] 
        });
      }
      const item = mapa.get(est.id);
      item.detalles.push(ins);
      
      const nombreCurso = grupo?.curso?.title ?? grupo?.course?.title;
      if (nombreCurso) {
        cursosSet.add(nombreCurso);
        if (!item.nombresCursos.includes(nombreCurso)) {
          item.nombresCursos.push(nombreCurso);
        }
      }
    });

    this.cursosFiltro = Array.from(cursosSet).map(c => ({ label: c, value: c }));

    const resultado = Array.from(mapa.values());
    resultado.forEach(item => item.cursosResumen = item.nombresCursos.join(', '));
    return resultado;
  }

  conmutarFila(llaveFila: string) {
    const nuevasFilas = { ...this.filasExpandidas }; 
    if (nuevasFilas[llaveFila]) {
      delete nuevasFilas[llaveFila];
    } else {
      nuevasFilas[llaveFila] = true;
    }
    this.filasExpandidas = nuevasFilas; 
  }

  abrirModalFoto(alumno: any) {
    this.alumnoSeleccionadoParaFoto = alumno;
    this.fotoForm.reset({ imagePath: alumno.imagePath || '' });
    this.mostrarModalFoto = true;
  }

  onFotoSeleccionada(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.cargandoFoto = true;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        setTimeout(() => {
          this.fotoForm.patchValue({ imagePath: e.target.result });
          this.cargandoFoto = false;
          this.cdr.detectChanges();
        }, 600);
      };
      reader.readAsDataURL(file);
    }
  }

  guardarFotoCarnet() {
    if (this.fotoForm.invalid) return;

    const nuevaFotoBase64 = this.fotoForm.value.imagePath;
    
    const datosActualizados = { 
      ...this.alumnoSeleccionadoParaFoto, 
      imagePath: nuevaFotoBase64 
    };

    this.estudiantesService.actualizarEstudiante(this.alumnoSeleccionadoParaFoto.id, datosActualizados).subscribe({
      next: () => {
        this.alumnoSeleccionadoParaFoto.imagePath = nuevaFotoBase64; 
        this.cdr.detectChanges(); 
        
        this.mostrarModalFoto = false;
        this.cargarInscripciones();
        
        Swal.fire({ icon: 'success', title: '¡Carnet Actualizado!', text: 'La foto se registró correctamente.', timer: 1500, showConfirmButton: false });
      },
      error: (err) => {
        console.error('Error al guardar foto', err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar la imagen.' });
      }
    });
  }

  confirmarAnularInscripcion(id: number) {
    Swal.fire({
      title: '¿Anular esta inscripción?',
      text: "Se liberará la vacante.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.inscripcionesService.eliminarInscripcion(id).subscribe({
          next: () => {
            this.cargarInscripciones();
            Swal.fire({ icon: 'success', title: 'Anulada', text: 'El registro fue removido.', confirmButtonColor: '#0ea5e9' });
          },
          error: (err) => console.error(err)
        });
      }
    });
  }
}