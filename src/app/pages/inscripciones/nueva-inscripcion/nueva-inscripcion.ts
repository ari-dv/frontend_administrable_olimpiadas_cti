import { Component, EventEmitter, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';

import { EstudiantesService }   from '../../../services/estudiantes.service';
import { CursosService }         from '../../../services/cursos.service';
import { GruposService }         from '../../../services/grupos.service';
import { InscripcionesService }  from '../../../services/inscripciones.service';

type TipoBeca = 'BC' | 'SB' | null;

interface DetalleInscripcion {
  grupoId:        number;
  curso:          string;
  grupo:          string;
  horario:        string;
  precioOriginal: number;
  descuento:      number;   // 0 | 50 | 100
  precioFinal:    number;
}

@Component({
  selector:    'app-nueva-inscripcion',
  standalone:  true,
  imports:     [CommonModule, FormsModule, SelectModule, ButtonModule, DialogModule],
  templateUrl: './nueva-inscripcion.html',
  styleUrl:    './nueva-inscripcion.scss'
})
export class NuevaInscripcionComponent implements OnInit {

  @Output() cerrar        = new EventEmitter<void>();
  @Output() recargarLista = new EventEmitter<void>();

  listaEstudiantes:     any[] = [];
  listaCursosConGrupos: any[] = [];
  estudianteSeleccionadoId: number | null = null;
  cursoActivoId:            number | null = null;
  grupoSeleccionadoId:      number | null = null;  
  modalHorariosVisible = false;
  gruposConInscripcionPrevia: Set<number> = new Set();
  errorInscripcionPrevia      = false;
  cargandoDatos          = false;
  errorCargaDatos        = false;
  cargandoInscripciones  = false;
  ultimoRecibo: DetalleInscripcion | null = null;
  costoCertificado: number = 20.00; 

  constructor(
    private estudiantesService:  EstudiantesService,
    private cursosService:        CursosService,
    private gruposService:        GruposService,
    private inscripcionesService: InscripcionesService,
    private cdr:                  ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.cargarDatos(); }

  cargarDatos(): void {
    this.cargandoDatos   = true;
    this.errorCargaDatos = false;

    forkJoin({
      estudiantes: this.estudiantesService.listarEstudiantes(),
      cursos:      this.cursosService.listarCursos(),
      grupos:      this.gruposService.listarGrupos()
    }).subscribe({
      next: (res: any) => {
        const estudiantes = res.estudiantes.content ?? res.estudiantes;
        const cursos      = res.cursos.content      ?? res.cursos;
        const grupos      = res.grupos.content       ?? res.grupos;

        this.listaEstudiantes = estudiantes.map((e: any) => ({
          ...e,
          nombreCompleto: `${e.dni} — ${e.lastNames}, ${e.names}`
        }));

        this.listaCursosConGrupos = cursos.map((c: any) => ({
          ...c,
          grupos: grupos.filter((g: any) => g.curso?.id === c.id)
        }));

        this.cargandoDatos = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoDatos   = false;
        this.errorCargaDatos = true;
        this.cdr.detectChanges();
      }
    });
  }

  onEstudianteCambio(): void {
    this.grupoSeleccionadoId        = null;
    this.gruposConInscripcionPrevia = new Set();
    this.errorInscripcionPrevia     = false;

    if (!this.estudianteSeleccionadoId) return;

    this.cargandoInscripciones = true;
    this.inscripcionesService
      .listarPorEstudiante(this.estudianteSeleccionadoId)
      .subscribe({
        next: (data: any) => {
          const lista = data.content ?? data;
          this.gruposConInscripcionPrevia = new Set(
            lista.map((i: any) => i.group?.id ?? i.groupId)
          );
          this.cargandoInscripciones = false;
          this.cdr.detectChanges();
        },
        error: () => {
          // No bloqueamos el flujo, pero advertimos en consola
          console.warn('No se pudieron cargar las inscripciones previas del estudiante.');
          this.cargandoInscripciones = false;
          this.cdr.detectChanges();
        }
      });
  }

  // ─────────────────────────────────────────────────────────────────
  // Modal de horarios
  // ─────────────────────────────────────────────────────────────────
  abrirModalHorarios(cursoId: number): void {
    this.cursoActivoId      = cursoId;
    this.modalHorariosVisible = true;
  }

  cerrarModalHorarios(): void {
    this.modalHorariosVisible = false;
  }

  // ─────────────────────────────────────────────────────────────────
  // Selección de grupo (solo 1)
  // ─────────────────────────────────────────────────────────────────
  seleccionarGrupo(grupoId: number): void {
    if (this.tieneInscripcionPrevia(grupoId)) return;

    if (this.grupoSeleccionadoId === grupoId) {
      this.grupoSeleccionadoId    = null;
      this.errorInscripcionPrevia = false;
    } else {
      this.grupoSeleccionadoId    = grupoId;
      this.errorInscripcionPrevia = this.gruposConInscripcionPrevia.has(grupoId);
    }
  }

  // Selecciona el grupo y cierra el modal inmediatamente (sin botón confirmar)
  seleccionarGrupoYCerrar(grupoId: number): void {
    if (this.tieneInscripcionPrevia(grupoId)) return;
    if (grupoId !== this.grupoSeleccionadoId) {
      this.grupoSeleccionadoId    = grupoId;
      this.errorInscripcionPrevia = false;
    }
    this.cerrarModalHorarios();
  }

  estaSeleccionado(grupoId: number): boolean {
    return this.grupoSeleccionadoId === grupoId;
  }

  tieneInscripcionPrevia(grupoId: number): boolean {
    return this.gruposConInscripcionPrevia.has(grupoId);
  }

  limpiarSeleccion(): void {
    this.grupoSeleccionadoId    = null;
    this.errorInscripcionPrevia = false;
  }

  // ─────────────────────────────────────────────────────────────────
  // Getters computados
  // ─────────────────────────────────────────────────────────────────
  get cursoActivo() {
    return this.listaCursosConGrupos.find(c => c.id === this.cursoActivoId) ?? null;
  }

  get estudianteActivo() {
    return this.listaEstudiantes.find(e => e.id === this.estudianteSeleccionadoId) ?? null;
  }

  get tipoBeca(): TipoBeca {
    return (this.estudianteActivo?.typeScholarship as TipoBeca) ?? null;
  }

  get labelBeca(): string {
    switch (this.tipoBeca) {
      case 'BC': return 'Beca 100 %';
      case 'SB':     return 'Semibeca 50 %';
      default:              return 'Sin beca';
    }
  }

  get claseBeca(): string {
    switch (this.tipoBeca) {
      case 'BC': return 'beca-completa';
      case 'SB':     return 'semi-beca';
      default:              return 'sin-beca';
    }
  }

  get porcentajeDescuento(): number {
    switch (this.tipoBeca) {
      case 'BC': return 100;
      case 'SB':     return 50;
      default:              return 0;
    }
  }

  get seleccionadoDetalle(): DetalleInscripcion | null {
    if (!this.grupoSeleccionadoId) return null;

    for (const curso of this.listaCursosConGrupos) {
      const grupo = curso.grupos.find((g: any) => g.id === this.grupoSeleccionadoId);
      if (grupo) {
        const precioOriginal = curso.price ?? 0;
        const descuento      = this.porcentajeDescuento;
        return {
          grupoId:        grupo.id,
          curso:          curso.title,
          grupo:          grupo.name,
          horario:        `${(grupo.startTime ?? '').slice(0,5)} – ${(grupo.endTime ?? '').slice(0,5)}`,
          precioOriginal,
          descuento,
          precioFinal: precioOriginal * (1 - descuento / 100)
        };
      }
    }
    return null;
  }

  get puedeConfirmar(): boolean {
    return (
      !!this.estudianteSeleccionadoId &&
      !!this.grupoSeleccionadoId      &&
      !this.errorInscripcionPrevia    &&
      !this.cargandoInscripciones
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // Guardar inscripción
  // ─────────────────────────────────────────────────────────────────
  guardarInscripcion(): void {
    if (!this.puedeConfirmar) return;

    Swal.fire({
      title:             'Procesando matrícula…',
      allowOutsideClick: false,
      didOpen:           () => Swal.showLoading()
    });

    this.inscripcionesService.crearInscripcion({
      studentId: this.estudianteSeleccionadoId,
      groupId:   this.grupoSeleccionadoId
    }).subscribe({
      next: () => {
        Swal.close();
        this.ultimoRecibo = this.seleccionadoDetalle;
        this.recargarLista.emit();
        this.mostrarExitoYRecibo();
      },
      error: (err: any) => {
        console.error(err);
        const msg = err?.error?.message ?? 'Verifica las vacantes o si el alumno ya está inscrito.';
        Swal.fire({
          icon:               'error',
          title:              'Error al inscribir',
          text:               msg,
          confirmButtonColor: '#0ea5e9'
        });
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // Éxito + oferta de recibo
  // ─────────────────────────────────────────────────────────────────
  private mostrarExitoYRecibo(): void {
    Swal.fire({
      icon:               'success',
      title:              '¡Inscripción exitosa!',
      html:               `El postulante fue matriculado correctamente.<br>
                           <small style="color:#64748b">¿Deseas descargar el comprobante?</small>`,
      showCancelButton:   true,
      confirmButtonText:  '<i class="pi pi-file-pdf"></i> Descargar recibo PDF',
      cancelButtonText:   'Cerrar',
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor:  '#94a3b8'
    }).then(result => {
      if (result.isConfirmed && this.ultimoRecibo) {
        this.generarReciboPDF(this.ultimoRecibo);
      }
      this.cerrar.emit();
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // Generación de recibo PDF con jsPDF (client-side)
  // ─────────────────────────────────────────────────────────────────
  generarReciboPDF(detalle: DetalleInscripcion): void {
    const doc        = new jsPDF({ unit: 'mm', format: 'a5' });
    const W          = doc.internal.pageSize.getWidth();
    const H          = doc.internal.pageSize.getHeight();
    const est        = this.estudianteActivo;
    const numero     = `REC-${Date.now().toString().slice(-8)}`;
    const fecha      = new Date().toLocaleDateString('es-PE', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    const AZUL  = [2,   132, 199] as [number,number,number];
    const DARK  = [15,  23,  42]  as [number,number,number];
    const GRIS  = [100, 116, 139] as [number,number,number];
    const LGRIS = [241, 245, 249] as [number,number,number];
    const VERDE = [5,   150, 105] as [number,number,number];
    const WHITE = [255, 255, 255] as [number,number,number];

    // ── Cabecera azul ─────────────────────────────────────────────
    doc.setFillColor(...AZUL);
    doc.rect(0, 0, W, 32, 'F');

    doc.setTextColor(...WHITE);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('RECIBO DE MATRÍCULA', W / 2, 13, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Academia / Centro de Estudios', W / 2, 21, { align: 'center' });

    // ── Franja gris: número + fecha ───────────────────────────────
    doc.setFillColor(...LGRIS);
    doc.rect(10, 36, W - 20, 13, 'F');

    doc.setTextColor(...DARK);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`N.° ${numero}`, 14, 43);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRIS);
    doc.setFontSize(8);
    doc.text(`Emitido el ${fecha}`, 14, 48);

    // ── Helper: fila etiqueta / valor ─────────────────────────────
    let y = 60;
    const fila = (label: string, valor: string) => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRIS);
      doc.text(label, 14, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK);
      doc.text(valor, 70, y);
      y += 7;
    };

    const seccion = (titulo: string) => {
      y += 3;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...AZUL);
      doc.text(titulo, 14, y);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, y + 2, W - 14, y + 2);
      y += 9;
    };

    // ── Datos del postulante ──────────────────────────────────────
    seccion('DATOS DEL POSTULANTE');
    fila('Apellidos y nombres', `${est?.lastNames ?? ''}, ${est?.names ?? ''}`);
    fila('DNI',                 est?.dni ?? '—');
    fila('Tipo de beca',        this.labelBeca);

    // ── Detalle de matrícula ──────────────────────────────────────
    seccion('DETALLE DE MATRÍCULA');
    fila('Curso',   detalle.curso);
    fila('Horario', detalle.grupo);
    fila('Turno',   detalle.horario);

    // ── Tabla de precios ──────────────────────────────────────────
    y += 4;
    const x1 = 14;
    const x2 = W - 14;
    const rH = 8.5;

    // precio original
    doc.setFillColor(...LGRIS);
    doc.rect(x1, y, x2 - x1, rH, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRIS);
    doc.text('Precio original', x1 + 3, y + 5.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(`S/ ${detalle.precioOriginal.toFixed(2)}`, x2 - 3, y + 5.8, { align: 'right' });
    y += rH;

    // descuento (solo si aplica)
    if (detalle.descuento > 0) {
      doc.setFillColor(...WHITE);
      doc.rect(x1, y, x2 - x1, rH, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRIS);
      doc.text(`Descuento ${this.labelBeca} (${detalle.descuento}%)`, x1 + 3, y + 5.8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...VERDE);
      const monto = detalle.precioOriginal * detalle.descuento / 100;
      doc.text(`- S/ ${monto.toFixed(2)}`, x2 - 3, y + 5.8, { align: 'right' });
      y += rH;
    }

    // total
    y += 2;
    doc.setFillColor(...AZUL);
    doc.rect(x1, y, x2 - x1, 11, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL A PAGAR', x1 + 3, y + 7.5);
    doc.text(`S/ ${detalle.precioFinal.toFixed(2)}`, x2 - 3, y + 7.5, { align: 'right' });
    y += 16;

    // ── Nota beca completa ────────────────────────────────────────
    if (detalle.precioFinal === 0) {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(134, 239, 172);
      doc.setLineWidth(0.4);
      doc.roundedRect(x1, y, x2 - x1, 10, 2, 2, 'FD');
      doc.setTextColor(...VERDE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Exonerado de pago por beca completa', W / 2, y + 6.5, { align: 'center' });
      y += 15;
    }

    // ── Pie de página ─────────────────────────────────────────────
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRIS);
    doc.text('Documento oficial de matrícula. Consérvalo para cualquier trámite académico.', W / 2, H - 10, { align: 'center' });
    doc.line(x1, H - 14, x2, H - 14);

    doc.save(`Recibo_${numero}_${est?.dni ?? 'estudiante'}.pdf`);
  }
}