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

        // Normalizar campo curso/course en cada grupo
        const gruposNormalizados = grupos.map((g: any) => ({
          ...g,
          curso: g.curso ?? g.course
        }));

        this.listaCursosConGrupos = cursos.map((c: any) => ({
          ...c,
          grupos: gruposNormalizados.filter((g: any) => g.curso?.id === c.id)
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
            lista.map((i: any) => i.group?.id ?? i.grupo?.id ?? i.groupId ?? i.grupoId)
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

  get costoCertificado(): number {
    return this.tipoBeca === 'BC' ? 50.00 : 0.00;
  }

  get seleccionadoDetalle(): DetalleInscripcion | null {
    if (!this.grupoSeleccionadoId) return null;

    for (const curso of this.listaCursosConGrupos) {
      const grupo = curso.grupos.find((g: any) => g.id === this.grupoSeleccionadoId);
      if (grupo) {
        const precioOriginal = curso.price ?? 0;
        const descuento      = this.porcentajeDescuento;
        const subtotal       = precioOriginal * (1 - descuento / 100);
        return {
          grupoId:        grupo.id,
          curso:          curso.title,
          grupo:          grupo.name,
          horario:        `${(grupo.startTime ?? '').slice(0,5)} – ${(grupo.endTime ?? '').slice(0,5)}`,
          precioOriginal,
          descuento,
          precioFinal: subtotal + this.costoCertificado
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
      html:               `El estudiante fue matriculado correctamente.<br>
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
    const doc = new jsPDF();
    const est = this.estudianteActivo;
    const fechaActual = new Date().toLocaleDateString('es-PE');
    const nroOrden = Math.floor(100000 + Math.random() * 900000);
    const nombreCompleto = `${est?.names ?? ''} ${est?.lastNames ?? ''}`.trim();

    // --- CUADRO RUC (Estilo SUNAT / Formal) ---
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(130, 15, 65, 30);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('R.U.C. N° 20146911639', 162.5, 23, { align: 'center' });

    doc.setFillColor(230, 230, 230);
    doc.rect(130, 26, 65, 8, 'FD');
    doc.setFontSize(11);
    doc.text('ORDEN DE PAGO', 162.5, 31.5, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38);
    doc.text(`N° 001 - ${nroOrden}`, 162.5, 41, { align: 'center' });

    // --- CABECERA IZQUIERDA (Datos Empresa) ---
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('CENTRO EN TECNOLOGÍAS', 15, 22);
    doc.text('DE INFORMACIÓN', 15, 29);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Universidad Nacional de San Martín', 15, 36);
    doc.text('Sede Tarapoto, San Martín, Perú', 15, 41);

    // --- DATOS DEL CLIENTE / estudiante ---
    doc.setDrawColor(200);
    doc.rect(15, 55, 180, 30);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Señor(es):', 18, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(nombreCompleto, 40, 62);

    doc.setFont('helvetica', 'bold');
    doc.text('DNI / Doc:', 18, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(est?.dni ?? '—', 40, 70);

    doc.setFont('helvetica', 'bold');
    doc.text('Fecha Emisión:', 130, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(fechaActual, 160, 62);

    doc.setFont('helvetica', 'bold');
    doc.text('Celular:', 18, 78);
    doc.setFont('helvetica', 'normal');
    doc.text(est?.phone ?? '—', 40, 78);

    doc.setFont('helvetica', 'bold');
    doc.text('Correo:', 130, 78);
    doc.setFont('helvetica', 'normal');
    doc.text(est?.email ?? '—', 150, 78);

    // --- TABLA DE DETALLES ---
    const startY = 95;
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.setTextColor(0);

    // Encabezados de tabla
    doc.setFillColor(240, 240, 240);
    doc.rect(15, startY, 180, 8, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('CANT.', 18, startY + 5.5);
    doc.text('DESCRIPCIÓN DEL CONCEPTO', 40, startY + 5.5);
    doc.text('P. UNIT.', 140, startY + 5.5);
    doc.text('IMPORTE', 170, startY + 5.5);

    // Fila 1: Curso
    doc.setFont('helvetica', 'normal');
    doc.rect(15, startY + 8, 180, 15);
    doc.text('1', 21, startY + 16);
    doc.text(`Matrícula: ${detalle.curso}`, 40, startY + 14);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Horario: ${detalle.grupo} (${detalle.horario})`, 40, startY + 19);
    doc.setTextColor(0);
    doc.setFontSize(9);
    doc.text(`S/ ${detalle.precioOriginal.toFixed(2)}`, 140, startY + 16);
    doc.text(`S/ ${detalle.precioOriginal.toFixed(2)}`, 170, startY + 16);

    // Fila 2: Descuento (Si hay beca)
    let finalY = startY + 23;
    if (detalle.descuento > 0) {
      doc.rect(15, finalY, 180, 10);
      doc.text('1', 21, finalY + 6);
      doc.text(`Beneficio Institucional Aplicado: ${this.labelBeca}`, 40, finalY + 6);
      const descuentoMonto = detalle.precioOriginal * detalle.descuento / 100;
      doc.text(`- S/ ${descuentoMonto.toFixed(2)}`, 140, finalY + 6);
      doc.text(`- S/ ${descuentoMonto.toFixed(2)}`, 170, finalY + 6);
      finalY += 10;
    }

    // Fila 3: Certificado (Si aplica)
    if (this.costoCertificado > 0) {
      doc.rect(15, finalY, 180, 10);
      doc.text('1', 21, finalY + 6);
      doc.text('Emisión de Certificado (Básico e Intermedio)', 40, finalY + 6);
      doc.text(`S/ ${this.costoCertificado.toFixed(2)}`, 140, finalY + 6);
      doc.text(`S/ ${this.costoCertificado.toFixed(2)}`, 170, finalY + 6);
      finalY += 10;
    }

    // --- TOTALES ---
    doc.rect(15, finalY, 180, 10);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL A PAGAR', 130, finalY + 6);
    doc.setFontSize(11);
    doc.text(`S/ ${detalle.precioFinal.toFixed(2)}`, 170, finalY + 6);

    // --- INSTRUCCIONES AL PIE ---
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);

    if (detalle.precioFinal > 0) {
      doc.text('INSTRUCCIONES DE PAGO:', 15, finalY + 20);
      doc.setFont('helvetica', 'normal');
      doc.text('1. Acércate a la caja central de la UNSM o realiza el depósito en la cuenta autorizada.', 15, finalY + 25);
      doc.text('2. Presenta este documento junto con tu voucher para activar tu matrícula.', 15, finalY + 30);
    } else {
      doc.text('DOCUMENTO VÁLIDO COMO CONSTANCIA DE BECA:', 15, finalY + 20);
      doc.setFont('helvetica', 'normal');
      doc.text('Tu inscripción ha sido procesada con beneficio del 100%. No requiere abono.', 15, finalY + 25);
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Documento generado por el Sistema de Inscripciones CTI.', 105, 280, { align: 'center' });

    doc.save(`Orden_Pago_CTI_${est?.dni ?? 'estudiante'}.pdf`);
  }
}