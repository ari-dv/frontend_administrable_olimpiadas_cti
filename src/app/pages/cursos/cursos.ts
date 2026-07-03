import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DialogModule } from 'primeng/dialog'; 
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber'; 
import { MultiSelectModule } from 'primeng/multiselect'; 
import { CursosService } from '../../services/cursos.service';
import { GruposService } from '../../services/grupos.service'; 
import { InscripcionesService } from '../../services/inscripciones.service'; 
import { VpsService } from '../../services/vps.service'; // <-- Asegúrate de que la ruta sea correcta
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cursos',
  standalone: true,
  imports: [
    CommonModule, TableModule, ButtonModule, TagModule, InputTextModule, 
    IconFieldModule, InputIconModule, DialogModule, SelectModule, 
    InputNumberModule, MultiSelectModule, ReactiveFormsModule, TooltipModule, ToggleSwitchModule,
    FormsModule
  ],
  templateUrl: './cursos.html',
  styleUrls: ['./cursos.scss']
})
export class CursosComponent implements OnInit {
  listaCursos: any[] = [];
  listaAlumnosGrupo: any[] = [];
  cargando: boolean = true;
  
  mostrarModal: boolean = false;
  mostrarModalAlumnos: boolean = false;
  mostrarModalHorarios: boolean = false;
  
  editando: boolean = false;
  cursoIdSeleccionado: number | null = null;
  cursoSeleccionadoParaHorarios: any = null;
  
  cursoForm: FormGroup;
  horarioForm: FormGroup;
  listaHorarios: any[] = [];
  archivoSeleccionado: File | null = null;
  vistaPrevia: string | ArrayBuffer | null = null;
  filasPorPagina: number = window.innerWidth < 768 ? 3 : 10;

  @HostListener('window:resize')
  onResize() {
    this.filasPorPagina = window.innerWidth < 768 ? 3 : 10;
  }

  niveles = [
    { label: 'Primaria', value: 'Primaria' },
    { label: 'Secundaria', value: 'Secundaria' }
  ];

  opcionesDias = [
    { label: 'Lunes', value: 'Lunes' }, { label: 'Martes', value: 'Martes' },
    { label: 'Miércoles', value: 'Miércoles' }, { label: 'Jueves', value: 'Jueves' },
    { label: 'Viernes', value: 'Viernes' }, { label: 'Sábado', value: 'Sábado' },
    { label: 'Domingo', value: 'Domingo' }
  ];

  opcionesPeriodo = [
    { label: '2026-I', value: '2026-I' }
  ];

  constructor(
    private cursosService: CursosService, 
    private gruposService: GruposService,
    private inscripcionesService: InscripcionesService,
    private vpsService: VpsService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder
  ) {
    this.cursoForm = this.fb.group({
      title: ['', Validators.required],
      level: ['', Validators.required],
      price: [null, [Validators.required, Validators.min(0)]],
      period: ['', Validators.required],
      imagePath: [''],
      isActive: [true]
    });

    this.horarioForm = this.fb.group({
      name: ['', Validators.required],
      diasArray: [null, Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      capacity: [30, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.cargarCursos();
  }

  // =========================================================
  // LÓGICA DE CURSOS
  // =========================================================
  cargarCursos(): void {
    // El setTimeout evita el choque en el ciclo de dibujado de Angular
    setTimeout(() => {
      this.cargando = true;
    });

    this.cursosService.listarCursos().subscribe({
      next: (datos) => {
        this.listaCursos = datos.content ? datos.content : datos;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar cursos', err);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  abrirModalNuevo() {
    this.editando = false;
    this.cursoIdSeleccionado = null;
    this.archivoSeleccionado = null;
    this.vistaPrevia = null;
    this.cursoForm.reset({ price: null, imagePath: '', isActive: true });
    this.mostrarModal = true;
  }

  abrirModalEditar(curso: any) {
    this.editando = true;
    this.cursoIdSeleccionado = curso.id;
    this.archivoSeleccionado = null;
    this.vistaPrevia = null;
    this.cursoForm.patchValue({
      title: curso.title,
      level: curso.level,
      price: curso.price,
      period: curso.period || '', 
      imagePath: curso.imagePath || '',
      isActive: curso.isActive !== false
    });
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }

  seleccionarImagen(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;
      const reader = new FileReader();
      reader.onload = e => this.vistaPrevia = reader.result;
      reader.readAsDataURL(file);
    }
  }

  guardarCurso() {
    if (this.cursoForm.invalid) {
      this.cursoForm.markAllAsTouched();
      return;
    }

    if (this.archivoSeleccionado) {
      Swal.fire({ title: 'Subiendo imagen...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      this.vpsService.subirImagen(this.archivoSeleccionado).subscribe({
        next: (res) => {
          // ¡AQUÍ ESTÁ LA CORRECCIÓN! Entramos a 'file' y luego a 'url'
          this.cursoForm.patchValue({ imagePath: res.file.url }); 
          this.enviarDatosASpring();
        },
        error: (err) => {
          Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo subir la imagen al servidor VPS.' });
          console.error(err);
        }
      });
    } else {
      this.enviarDatosASpring();
    }
  }
  enviarDatosASpring() {
    const datosCurso = this.cursoForm.value;
    datosCurso.slug = datosCurso.title.toLowerCase().replace(/\s+/g, '-');

    if (this.editando && this.cursoIdSeleccionado) {
      this.cursosService.actualizarCurso(this.cursoIdSeleccionado, datosCurso).subscribe({
        next: () => {
          this.cerrarModal();
          this.cargarCursos();
          Swal.fire({ icon: 'success', title: '¡Actualizado!', text: 'El curso se modificó correctamente.', confirmButtonColor: '#0ea5e9' });
        },
        error: (err) => {
          const mensaje = err.error?.message || 'Error al actualizar. Revisa que no haya datos duplicados.';
          Swal.fire({ icon: 'error', title: 'Error', text: mensaje });
        }
      });
    } else {
      this.cursosService.crearCurso(datosCurso).subscribe({
        next: () => {
          this.cerrarModal();
          this.cargarCursos();
          Swal.fire({ icon: 'success', title: '¡Guardado!', text: 'El curso se registró correctamente.', confirmButtonColor: '#0ea5e9' });
        },
        error: (err) => {
          const mensaje = err.error?.message || 'El curso ya existe o los datos son inválidos.';
          Swal.fire({ icon: 'error', title: 'Error', text: mensaje });
        }
      });
    }
  }

  confirmarEliminar(id: number) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción no se puede revertir",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cursosService.eliminarCurso(id).subscribe({
          next: () => {
            this.cargarCursos();
            Swal.fire({ icon: 'success', title: '¡Eliminado!', text: 'El curso ha sido removido.', confirmButtonColor: '#0ea5e9' });
          },
          error: (err) => {
            console.error('Error al eliminar', err);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar el curso. Verifica si tiene horarios asignados.' });
          }
        });
      }
    });
  }

  onCambioEstadoToggle() {
    const nuevoEstado = this.cursoForm.value.isActive;

    Swal.fire({
      title: nuevoEstado ? '¿Activar curso?' : '¿Desactivar curso?',
      text: nuevoEstado ? 'Estará disponible para nuevas inscripciones.' : 'Nadie podrá inscribirse en este curso.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: nuevoEstado ? '#10b981' : '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (!result.isConfirmed) {
        // Revertimos el switch en el formulario si cancela
        this.cursoForm.patchValue({ isActive: !nuevoEstado });
      }
    });
  }

  // =========================================================
  // LÓGICA DE HORARIOS / GRUPOS
  // =========================================================
  abrirModalHorarios(curso: any) {
    this.cursoSeleccionadoParaHorarios = curso;
    this.cargarHorariosDelCurso(curso.id);
    this.horarioForm.reset({ capacity: 30 });
    this.mostrarModalHorarios = true;
  }

  cargarHorariosDelCurso(cursoId: number) {
    this.gruposService.listarPorCurso(cursoId).subscribe({
      next: (datos: any) => {
        // Manejar respuesta paginada del backend (content) o array directo
        this.listaHorarios = datos?.content ?? (Array.isArray(datos) ? datos : []);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar horarios', err)
    });
  }

  guardarHorario() {
    if (this.horarioForm.invalid) {
      this.horarioForm.markAllAsTouched();
      return;
    }

    const formValues = this.horarioForm.value;
    const datosGrupo = {
      curso: { id: this.cursoSeleccionadoParaHorarios.id }, 
      name: formValues.name,
      days: formValues.diasArray.join(', '),
      startTime: formValues.startTime,
      endTime: formValues.endTime,
      capacity: formValues.capacity,
      isActive: true
    };

    this.gruposService.crearGrupo(datosGrupo).subscribe({
      next: () => {
        this.horarioForm.reset({ capacity: 30 });
        this.cargarHorariosDelCurso(this.cursoSeleccionadoParaHorarios.id);
        Swal.fire({ icon: 'success', title: '¡Agregado!', text: 'Horario registrado al curso.', timer: 1500, showConfirmButton: false });
      },
      error: (err) => console.error('Error al guardar horario', err)
    });
  }
  eliminarHorario(id: number) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción eliminará el horario de forma permanente.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.gruposService.eliminarGrupo(id).subscribe({
          next: () => {
            this.cargarHorariosDelCurso(this.cursoSeleccionadoParaHorarios.id);
            Swal.fire({ icon: 'success', title: '¡Eliminado!', text: 'El horario ha sido removido.', timer: 1500, showConfirmButton: false });
          },
          error: (err) => {
            console.error('Error al eliminar horario', err);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar el horario. Verifica si tiene alumnos inscritos.' });
          }
        });
      }
    });
  }

  verAlumnosDelGrupo(grupoId: number) {
    this.listaAlumnosGrupo = []; 
    this.mostrarModalAlumnos = true; 

    this.inscripcionesService.listarPorGrupo(grupoId).subscribe({
      next: (datos: any) => {
        const lista = datos?.content ?? (Array.isArray(datos) ? datos : []);
        // Normalizar campo estudiante/student
        this.listaAlumnosGrupo = lista.map((ins: any) => ({
          ...ins,
          estudiante: ins.estudiante ?? ins.student
        }));
      },
      error: (err) => console.error('Error al cargar alumnos', err)
    });
  }
}