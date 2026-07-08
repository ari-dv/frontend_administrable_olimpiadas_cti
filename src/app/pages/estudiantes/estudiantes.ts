import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http'; // Importante para la consulta directa
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DialogModule } from 'primeng/dialog'; 
import { EstudiantesService } from '../../services/estudiantes.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-estudiantes',
  standalone: true,
  imports: [
    CommonModule, TableModule, ButtonModule, TagModule, InputTextModule, 
    IconFieldModule, InputIconModule, DialogModule, ReactiveFormsModule
  ],
  templateUrl: './estudiantes.html',
  styleUrls: ['./estudiantes.scss']
})
export class EstudiantesComponent implements OnInit {
  listaEstudiantes: any[] = [];
  cargando: boolean = true;
  
  mostrarModal: boolean = false;
  editando: boolean = false;
  estudianteIdSeleccionado: number | null = null;
  estudianteForm: FormGroup;

  // Estado de carga para el buscador de DNI
  buscandoDni: boolean = false;
  filasPorPagina: number = window.innerWidth < 768 ? 3 : 10;

  @HostListener('window:resize')
  onResize() {
    this.filasPorPagina = window.innerWidth < 768 ? 3 : 10;
  }

  constructor(
    private estudiantesService: EstudiantesService, 
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private http: HttpClient // Inyección del cliente HTTP
  ) {
    this.estudianteForm = this.fb.group({
      dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]], // Validación para DNI peruano (8 dígitos)
      names: ['', Validators.required],
      lastNames: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.pattern(/^\d{9}$/)] // Opcional pero debe tener 9 dígitos si se llena
    });
  }

  ngOnInit(): void {
    this.cargarEstudiantes();

    // Escucha cambios en el campo DNI para autocompletar al llegar a 8 dígitos
    this.estudianteForm.get('dni')?.valueChanges.subscribe(value => {
      if (value && value.length === 8 && !this.editando) {
        this.buscarDatosReniec(value);
      }
    });
  }

  cargarEstudiantes(): void {
    this.cargando = true;
    this.estudiantesService.listarEstudiantes().subscribe({
      next: (datos) => {
        this.listaEstudiantes = datos.content ? datos.content : datos;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar estudiantes', err);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  buscarDatosReniec(dni: string) {
    this.buscandoDni = true;
    this.cdr.detectChanges();

    this.http.get<any>(`http://185.182.9.69:8080/api/reniec/consultar?dni=${dni}`).subscribe({
      next: (datos) => {
        const info = typeof datos === 'string' ? JSON.parse(datos) : datos;

        if (info && info.nombres) {
          this.estudianteForm.patchValue({
            names: info.nombres,
            lastNames: `${info.apellidoPaterno} ${info.apellidoMaterno}`
          });
          
          Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2500,
            icon: 'success',
            title: 'Datos obtenidos de RENIEC'
          });
        }
        this.buscandoDni = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.buscandoDni = false;
        this.cdr.detectChanges();
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2500,
          icon: 'error',
          title: 'DNI no encontrado en RENIEC'
        });
      }
    });
  }

  abrirModalNuevo() {
    this.editando = false;
    this.estudianteIdSeleccionado = null;
    this.estudianteForm.reset();
    this.mostrarModal = true;
  }

  abrirModalEditar(estudiante: any) {
    this.editando = true;
    this.estudianteIdSeleccionado = estudiante.id;
    this.estudianteForm.patchValue({
      dni: estudiante.dni,
      names: estudiante.names,
      lastNames: estudiante.lastNames,
      email: estudiante.email,
      phone: estudiante.phone
    });
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }

  guardarEstudiante() {
    if (this.estudianteForm.invalid) {
      this.estudianteForm.markAllAsTouched();
      return;
    }

    const datosEstudiante = this.estudianteForm.value;
    datosEstudiante.isActive = true;

    if (this.editando && this.estudianteIdSeleccionado) {
      this.estudiantesService.actualizarEstudiante(this.estudianteIdSeleccionado, datosEstudiante).subscribe({
        next: () => {
          this.cerrarModal();
          this.cargarEstudiantes();
          Swal.fire({ icon: 'success', title: '¡Actualizado!', text: 'Los datos del estudiante se modificaron.', confirmButtonColor: '#0ea5e9' });
        },
        error: (err) => {
          console.error('Error al actualizar', err);
          // MANEJO DE ERROR VISUAL
          const mensajeError = err.error?.message || 'No se pudo actualizar. Verifica tu conexión o los datos.';
          Swal.fire({ icon: 'error', title: 'Error al actualizar', text: mensajeError, confirmButtonColor: '#0ea5e9' });
        }
      });
    } else {
      this.estudiantesService.crearEstudiante(datosEstudiante).subscribe({
        next: () => {
          this.cerrarModal();
          this.cargarEstudiantes();
          Swal.fire({ icon: 'success', title: '¡Registrado!', text: 'El estudiante se inscribió correctamente.', confirmButtonColor: '#0ea5e9' });
        },
        error: (err) => {
          console.error('Error al guardar', err);
          const mensajeError = err.error?.message || 'Hubo un problema. ¿Quizás el DNI o correo ya están registrados?';
          Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: mensajeError, confirmButtonColor: '#0ea5e9' });
        }
      });
    }
  }

  confirmarEliminar(id: number) {
    Swal.fire({
      title: '¿Retirar estudiante?',
      text: "Esta acción dará de baja al alumno en el sistema.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.estudiantesService.eliminarEstudiante(id).subscribe({
          next: () => {
            this.cargarEstudiantes();
            Swal.fire({ icon: 'success', title: '¡Eliminado!', text: 'El estudiante fue removido.', confirmButtonColor: '#0ea5e9' });
          },
          error: (err) => {
            console.error('Error al eliminar', err);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar al estudiante.' });
          }
        });
      }
    });
  }
}