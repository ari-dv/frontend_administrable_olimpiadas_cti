// =============================================================================
// generar-docx.mjs — Genera la documentación técnica en formato Word (.docx)
// Ejecutar con:  node generar-docx.mjs
// =============================================================================
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageBreak, TabStopType, TabStopPosition, Header, Footer,
  ImageRun, TableOfContents, ExternalHyperlink
} from 'docx';
import fs from 'fs';

// ── Colores corporativos ────────────────────────────────────────────────────
const AZUL      = '0284C7';
const AZUL_DARK = '0C4A6E';
const DARK      = '0F172A';
const GRIS      = '64748B';
const LGRIS     = 'F1F5F9';
const VERDE     = '059669';
const BLANCO    = 'FFFFFF';

// ── Helpers ─────────────────────────────────────────────────────────────────
const blankLine = () => new Paragraph({ spacing: { after: 100 } });

const heading1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 400, after: 200 },
  children: [new TextRun({ text, bold: true, size: 32, color: AZUL_DARK, font: 'Aptos' })],
});

const heading2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 300, after: 150 },
  children: [new TextRun({ text, bold: true, size: 26, color: AZUL, font: 'Aptos' })],
});

const heading3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 250, after: 120 },
  children: [new TextRun({ text, bold: true, size: 24, color: DARK, font: 'Aptos' })],
});

const heading4 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_4,
  spacing: { before: 200, after: 100 },
  children: [new TextRun({ text, bold: true, size: 22, color: DARK, font: 'Aptos' })],
});

const para = (text, opts = {}) => new Paragraph({
  spacing: { after: 120 },
  alignment: opts.align || AlignmentType.JUSTIFIED,
  indent: opts.indent ? { left: opts.indent } : undefined,
  children: [new TextRun({
    text,
    size: opts.size || 22,
    font: opts.font || 'Aptos',
    color: opts.color || DARK,
    bold: opts.bold || false,
    italics: opts.italics || false,
  })],
});

const bullet = (text, level = 0) => new Paragraph({
  spacing: { after: 60 },
  bullet: { level },
  alignment: AlignmentType.JUSTIFIED,
  children: [new TextRun({ text, size: 22, font: 'Aptos', color: DARK })],
});

const bulletRich = (runs, level = 0) => new Paragraph({
  spacing: { after: 60 },
  bullet: { level },
  alignment: AlignmentType.JUSTIFIED,
  children: runs,
});

const bold = (text, size = 22) => new TextRun({ text, bold: true, size, font: 'Aptos', color: DARK });
const normal = (text, size = 22) => new TextRun({ text, size, font: 'Aptos', color: DARK });
const italic = (text, size = 22) => new TextRun({ text, italics: true, size, font: 'Aptos', color: GRIS });
const code = (text) => new TextRun({ text, size: 20, font: 'Consolas', color: AZUL });

const numberedStep = (number, text) => new Paragraph({
  spacing: { after: 80 },
  indent: { left: 360 },
  alignment: AlignmentType.JUSTIFIED,
  children: [
    new TextRun({ text: `${number}. `, bold: true, size: 22, font: 'Aptos', color: AZUL }),
    new TextRun({ text, size: 22, font: 'Aptos', color: DARK }),
  ],
});

const numberedStepRich = (number, runs) => new Paragraph({
  spacing: { after: 80 },
  indent: { left: 360 },
  alignment: AlignmentType.JUSTIFIED,
  children: [
    new TextRun({ text: `${number}. `, bold: true, size: 22, font: 'Aptos', color: AZUL }),
    ...runs,
  ],
});

// ── Tabla helper ────────────────────────────────────────────────────────────
const noBorder = { style: BorderStyle.NONE, size: 0, color: BLANCO };
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

const headerCell = (text, width) => new TableCell({
  width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
  shading: { type: ShadingType.SOLID, color: AZUL_DARK },
  borders,
  children: [new Paragraph({
    spacing: { before: 60, after: 60 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, bold: true, size: 20, font: 'Aptos', color: BLANCO })],
  })],
});

const dataCell = (text, width, opts = {}) => new TableCell({
  width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
  shading: opts.shading ? { type: ShadingType.SOLID, color: opts.shading } : undefined,
  borders,
  children: [new Paragraph({
    spacing: { before: 40, after: 40 },
    alignment: opts.align || AlignmentType.LEFT,
    children: [new TextRun({
      text,
      size: opts.size || 20,
      font: opts.font || 'Aptos',
      color: opts.color || DARK,
      bold: opts.bold || false,
    })],
  })],
});

const codeCellContent = (text, width) => new TableCell({
  width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
  borders,
  children: [new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 18, font: 'Consolas', color: AZUL })],
  })],
});

// ── Marcador de captura ─────────────────────────────────────────────────────
const capturaPlaceholder = (titulo, descripcion) => [
  new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text: titulo, bold: true, size: 22, font: 'Aptos', color: DARK })],
  }),
  new Paragraph({
    spacing: { after: 60 },
    shading: { type: ShadingType.SOLID, color: LGRIS },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '[ INSERTAR CAPTURA AQUÍ ]', bold: true, size: 24, font: 'Aptos', color: AZUL })],
  }),
  new Paragraph({
    spacing: { after: 200 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text: `Descripción: ${descripcion}`, italics: true, size: 20, font: 'Aptos', color: GRIS })],
  }),
];

// =============================================================================
//  DOCUMENTO
// =============================================================================
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Aptos', size: 22, color: DARK },
        paragraph: { spacing: { line: 300 } },
      },
    },
  },
  sections: [
    // ╔═══════════════════════════════════════════════════════════════════════╗
    // ║  PORTADA                                                            ║
    // ╚═══════════════════════════════════════════════════════════════════════╝
    {
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      children: [
        blankLine(), blankLine(), blankLine(), blankLine(), blankLine(),
        blankLine(), blankLine(), blankLine(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: 'DOCUMENTACIÓN TÉCNICA INTEGRAL FINAL', bold: true, size: 36, font: 'Aptos', color: AZUL_DARK })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: 'Módulo de Cursos, Grupos e Inscripciones', bold: true, size: 30, font: 'Aptos', color: AZUL })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: 'Panel Administrativo', size: 28, font: 'Aptos', color: GRIS })],
        }),
        // Línea decorativa
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', size: 28, color: AZUL })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: 'Sistema de Olimpiadas Escolares CTI', bold: true, size: 26, font: 'Aptos', color: DARK })],
        }),
        blankLine(), blankLine(), blankLine(),
        // Tabla de metadatos
        new Table({
          width: { size: 60, type: WidthType.PERCENTAGE },
          alignment: AlignmentType.CENTER,
          rows: [
            new TableRow({ children: [
              dataCell('Proyecto', 35, { bold: true, shading: LGRIS }),
              dataCell('Olimpiadas Escolares CTI — Panel Administrativo', 65),
            ]}),
            new TableRow({ children: [
              dataCell('Repositorio', 35, { bold: true, shading: LGRIS }),
              dataCell('demo-frontend-olimpiadas (Angular 21)', 65),
            ]}),
            new TableRow({ children: [
              dataCell('Actividad', 35, { bold: true, shading: LGRIS }),
              dataCell('Elaboración de la documentación técnica integral final del módulo de cursos y manual de usuario', 65),
            ]}),
            new TableRow({ children: [
              dataCell('Fecha de emisión', 35, { bold: true, shading: LGRIS }),
              dataCell('30 de junio de 2026', 65),
            ]}),
            new TableRow({ children: [
              dataCell('Versión', 35, { bold: true, shading: LGRIS }),
              dataCell('1.0', 65),
            ]}),
          ],
        }),
        blankLine(), blankLine(), blankLine(), blankLine(), blankLine(), blankLine(), blankLine(), blankLine(),
      ],
    },

    // ╔═══════════════════════════════════════════════════════════════════════╗
    // ║  ÍNDICE (placeholder manual)                                        ║
    // ╚═══════════════════════════════════════════════════════════════════════╝
    {
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
      },
      children: [
        heading1('ÍNDICE'),
        blankLine(),
        para('1.  Introducción'),
        para('2.  Diseño de Interfaz'),
        para('    2.1  Stack tecnológico del frontend'),
        para('    2.2  Justificación del uso de PrimeNG'),
        para('    2.3  Estructura de navegación'),
        para('3.  Diagrama de Flujo — Lógica de Negocio'),
        para('    3.1  Diagrama de flujo de la arquitectura de comunicación'),
        para('    3.2  Explicación del flujo'),
        para('4.  Manual de Usuario del Administrador'),
        para('    4.1  Gestión de Cursos y Grupos'),
        para('    4.2  Seguimiento de Inscripciones'),
        para('    4.3  Reportes y Listas de Alumnos Matriculados por Aula'),
        para('5.  Anexos y Evidencias'),
      ],
    },

    // ╔═══════════════════════════════════════════════════════════════════════╗
    // ║  SECCIÓN 1 — INTRODUCCIÓN                                           ║
    // ╚═══════════════════════════════════════════════════════════════════════╝
    {
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
      },
      children: [
        heading1('1. Introducción'),
        para('El Panel Administrativo del Sistema de Olimpiadas Escolares CTI constituye la herramienta de gestión interna destinada al personal autorizado de la institución educativa. Su propósito fundamental es centralizar y automatizar los procesos administrativos derivados de la organización, planificación y ejecución de las Olimpiadas Escolares, abarcando desde la configuración académica hasta el control integral de matrículas.'),
        para('Desde el punto de vista funcional, el Panel Administrativo cumple los siguientes objetivos:'),
        bulletRich([bold('Administración del catálogo académico: '), normal('permite registrar, editar, activar/desactivar y eliminar cursos ofertados, incluyendo la asignación de nivel educativo (Primaria o Secundaria), periodo académico, precio de matrícula e imagen representativa.')]),
        bulletRich([bold('Gestión de grupos y horarios: '), normal('facilita la creación de grupos (aulas) vinculados a cada curso, definiendo los días de dictado, rango horario y capacidad máxima de vacantes para cada grupo.')]),
        bulletRich([bold('Control de inscripciones y matrículas: '), normal('centraliza el proceso de matrícula de los postulantes, integrando validaciones de negocio tales como la verificación de inscripciones previas, el cálculo automático de descuentos por beca (Beca Completa al 100% o Semibeca al 50%) y la generación de comprobantes de matrícula en formato PDF.')]),
        bulletRich([bold('Gestión de estudiantes: '), normal('administra el padrón de postulantes registrados con datos personales (DNI, nombres, apellidos, correo electrónico y teléfono), incluyendo la funcionalidad de autocompletado mediante consulta a la API de RENIEC.')]),
        bulletRich([bold('Seguimiento y reportería: '), normal('ofrece al administrador la capacidad de visualizar, filtrar y monitorear el consolidado de inscripciones agrupadas por estudiante y por curso, así como extraer el padrón de alumnos matriculados por grupo o aula específica.')]),
        blankLine(),
        para('El sistema opera bajo una arquitectura cliente-servidor desacoplada: el frontend, desarrollado en Angular 21 con renderizado del lado del servidor (SSR), consume una API REST implementada en Spring Boot (Java) expuesta en el puerto 8080. Este desacoplamiento garantiza la escalabilidad, mantenibilidad y la posibilidad de integrar futuros módulos (resultados de olimpiadas, notificaciones, reportes estadísticos) sin afectar la base existente.'),
      ],
    },

    // ╔═══════════════════════════════════════════════════════════════════════╗
    // ║  SECCIÓN 2 — DISEÑO DE INTERFAZ                                     ║
    // ╚═══════════════════════════════════════════════════════════════════════╝
    {
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
      },
      children: [
        heading1('2. Diseño de Interfaz'),

        heading2('2.1. Stack tecnológico del frontend'),
        para('De acuerdo con el análisis del archivo de configuración package.json, el frontend del Panel Administrativo se sustenta sobre el siguiente stack tecnológico:'),
        blankLine(),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [headerCell('Tecnología', 25), headerCell('Versión', 15), headerCell('Propósito', 60)] }),
            new TableRow({ children: [dataCell('Angular', 25, { bold: true }), dataCell('^21.2.0', 15), dataCell('Framework principal (componentes standalone, SSR)', 60)] }),
            new TableRow({ children: [dataCell('PrimeNG', 25, { bold: true }), dataCell('^21.1.8', 15), dataCell('Biblioteca de componentes UI empresariales', 60)] }),
            new TableRow({ children: [dataCell('@primeng/themes (Aura)', 25, { bold: true }), dataCell('^21.0.4', 15), dataCell('Sistema de temas unificado con preset Aura', 60)] }),
            new TableRow({ children: [dataCell('PrimeIcons', 25, { bold: true }), dataCell('^7.0.0', 15), dataCell('Iconografía coherente del sistema de diseño', 60)] }),
            new TableRow({ children: [dataCell('SweetAlert2', 25, { bold: true }), dataCell('^11.26.25', 15), dataCell('Diálogos de confirmación y retroalimentación visual', 60)] }),
            new TableRow({ children: [dataCell('jsPDF', 25, { bold: true }), dataCell('^4.2.1', 15), dataCell('Generación de comprobantes PDF en el cliente', 60)] }),
            new TableRow({ children: [dataCell('RxJS', 25, { bold: true }), dataCell('~7.8.0', 15), dataCell('Programación reactiva para flujos HTTP asíncronos', 60)] }),
          ],
        }),
        blankLine(),

        heading2('2.2. Justificación del uso de PrimeNG'),
        para('La adopción de PrimeNG como biblioteca de componentes de interfaz de usuario responde a criterios técnicos y de productividad debidamente fundamentados:'),
        blankLine(),
        new Paragraph({
          spacing: { after: 80 },
          alignment: AlignmentType.JUSTIFIED,
          children: [
            bold('a) Estandarización del diseño. '),
            normal('PrimeNG proporciona un catálogo de más de 80 componentes preconstruidos que comparten una misma guía de estilo visual. El proyecto emplea el preset temático Aura (configurado en app.config.ts), lo cual garantiza que todos los controles de la interfaz — tablas, botones, diálogos modales, selectores, campos de texto, etiquetas, íconos y switches — mantengan coherencia tipográfica, cromática y dimensional sin necesidad de intervención manual en cada componente. Esta homogeneidad visual es imprescindible en un panel administrativo donde la legibilidad y la predictibilidad de la interfaz reducen la curva de aprendizaje del operador.'),
          ],
        }),
        blankLine(),
        new Paragraph({
          spacing: { after: 80 },
          alignment: AlignmentType.JUSTIFIED,
          children: [
            bold('b) Mejora de la experiencia de usuario. '),
            normal('Los componentes utilizados en el proyecto — entre los que se identifican p-table (tablas con filtro global, ordenamiento y paginación), p-dialog (ventanas modales), p-select (selectores con filtro de búsqueda), p-multiSelect (selección múltiple de días), p-inputNumber (campos numéricos con botones de incremento), p-toggleSwitch (interruptores de estado) y p-tag (etiquetas de estado) — incorporan de fábrica interacciones avanzadas como filtrado en tiempo real, mensajes de tabla vacía (emptymessage), tooltips contextuales y animaciones de transición. Estas características enriquecen la experiencia del administrador sin requerir desarrollo adicional.'),
          ],
        }),
        blankLine(),
        new Paragraph({
          spacing: { after: 80 },
          alignment: AlignmentType.JUSTIFIED,
          children: [
            bold('c) Aceleración del desarrollo de tablas y formularios. '),
            normal('El módulo de cursos, que constituye la vista más compleja del sistema, integra tres niveles de interacción (tabla principal de cursos → modal de gestión de horarios/grupos → modal de lista de alumnos inscritos por grupo). Gracias a la directiva de plantillas de PrimeNG (pTemplate), estas estructuras se definen de forma declarativa en el HTML del componente, reduciendo significativamente el código imperativo necesario y facilitando el mantenimiento evolutivo del módulo.'),
          ],
        }),
        blankLine(),

        heading2('2.3. Estructura de navegación'),
        para('El layout principal del Panel Administrativo (definido en app.html y app.ts) se compone de:'),
        bulletRich([bold('Barra lateral (sidebar): '), normal('menú de navegación colapsable con las secciones Inicio, Cursos, Estudiantes e Inscripciones, agrupadas bajo la categoría «Académico». Emplea iconografía de PrimeIcons y resaltado visual del enlace activo mediante la directiva routerLinkActive.')]),
        bulletRich([bold('Barra superior (topbar): '), normal('muestra la fecha actual en formato localizado (español) y un botón de colapso del menú lateral.')]),
        bulletRich([bold('Área de contenido: '), normal('renderiza dinámicamente el componente asociado a la ruta activa mediante <router-outlet>.')]),
      ],
    },

    // ╔═══════════════════════════════════════════════════════════════════════╗
    // ║  SECCIÓN 3 — DIAGRAMA DE FLUJO                                      ║
    // ╚═══════════════════════════════════════════════════════════════════════╝
    {
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
      },
      children: [
        heading1('3. Diagrama de Flujo — Lógica de Negocio'),

        heading2('3.1. Diagrama de flujo de la arquitectura de comunicación'),
        para('El siguiente diagrama representa el flujo de interacción entre el administrador y los componentes del sistema, desde la selección de un módulo en la interfaz de usuario hasta la comunicación con la API REST del backend.'),
        blankLine(),
        para('Nota: El código Mermaid.js se incluye a continuación para su renderizado en herramientas compatibles (draw.io, Mermaid Live Editor, GitHub, etc.):', { italics: true, color: GRIS }),
        blankLine(),
        // Código Mermaid en bloque
        new Paragraph({
          spacing: { after: 40 },
          shading: { type: ShadingType.SOLID, color: LGRIS },
          children: [new TextRun({ text: 'flowchart TD', size: 18, font: 'Consolas', color: AZUL })],
        }),
        new Paragraph({
          shading: { type: ShadingType.SOLID, color: LGRIS },
          children: [new TextRun({ text: '    A["👤 Administrador"] -->|"Accede al Panel y selecciona módulo"| B["🖥️ Interfaz Angular (Componente)"]', size: 18, font: 'Consolas', color: DARK })],
        }),
        new Paragraph({
          shading: { type: ShadingType.SOLID, color: LGRIS },
          children: [new TextRun({ text: '    B -->|"Invoca método del servicio"| C["⚙️ Servicio Angular (HttpClient / RxJS)"]', size: 18, font: 'Consolas', color: DARK })],
        }),
        new Paragraph({
          shading: { type: ShadingType.SOLID, color: LGRIS },
          children: [new TextRun({ text: '    C -->|"Petición HTTP (GET/POST/PUT/DELETE)"| D["🌐 API REST Spring Boot (localhost:8080)"]', size: 18, font: 'Consolas', color: DARK })],
        }),
        new Paragraph({
          shading: { type: ShadingType.SOLID, color: LGRIS },
          children: [new TextRun({ text: '    D -->|"Respuesta JSON (datos/error)"| C', size: 18, font: 'Consolas', color: DARK })],
        }),
        new Paragraph({
          shading: { type: ShadingType.SOLID, color: LGRIS },
          children: [new TextRun({ text: '    C -->|"Observable (subscribe)"| B', size: 18, font: 'Consolas', color: DARK })],
        }),
        new Paragraph({
          shading: { type: ShadingType.SOLID, color: LGRIS },
          children: [new TextRun({ text: '    B -->|"Renderiza datos en tabla/formulario"| E["📊 Vista Actualizada (PrimeNG)"]', size: 18, font: 'Consolas', color: DARK })],
        }),
        new Paragraph({
          spacing: { after: 200 },
          shading: { type: ShadingType.SOLID, color: LGRIS },
          children: [new TextRun({ text: '    E -->|"Feedback visual (SweetAlert2)"| A', size: 18, font: 'Consolas', color: DARK })],
        }),
        blankLine(),
        // Diagrama visual en texto plano (representación simplificada para Word)
        para('Representación simplificada del flujo:', { bold: true }),
        blankLine(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '┌──────────────────┐', size: 20, font: 'Consolas', color: AZUL_DARK })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '│   ADMINISTRADOR   │', size: 20, font: 'Consolas', color: AZUL_DARK, bold: true })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '└────────┬─────────┘', size: 20, font: 'Consolas', color: AZUL_DARK })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '         │ Selecciona módulo en UI', size: 20, font: 'Consolas', color: GRIS })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '         ▼', size: 20, font: 'Consolas', color: AZUL })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '┌──────────────────┐', size: 20, font: 'Consolas', color: AZUL })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '│ COMPONENTE ANGULAR│', size: 20, font: 'Consolas', color: AZUL, bold: true })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '└────────┬─────────┘', size: 20, font: 'Consolas', color: AZUL })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '         │ Invoca servicio (HttpClient)', size: 20, font: 'Consolas', color: GRIS })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '         ▼', size: 20, font: 'Consolas', color: VERDE })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '┌──────────────────┐', size: 20, font: 'Consolas', color: VERDE })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '│ SERVICIO ANGULAR  │', size: 20, font: 'Consolas', color: VERDE, bold: true })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '│ (HttpClient/RxJS) │', size: 20, font: 'Consolas', color: VERDE })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '└────────┬─────────┘', size: 20, font: 'Consolas', color: VERDE })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '         │ Petición HTTP', size: 20, font: 'Consolas', color: GRIS })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '         ▼', size: 20, font: 'Consolas', color: 'D97706' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '┌──────────────────┐', size: 20, font: 'Consolas', color: 'D97706' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '│  API REST (8080)  │', size: 20, font: 'Consolas', color: 'D97706', bold: true })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '│  Spring Boot      │', size: 20, font: 'Consolas', color: 'D97706' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: '└──────────────────┘', size: 20, font: 'Consolas', color: 'D97706' })],
        }),
        blankLine(),

        heading2('3.2. Explicación del flujo'),
        para('La lógica de negocio del Panel Administrativo sigue un patrón de arquitectura en capas propio de las aplicaciones Angular empresariales. Cuando el administrador selecciona un módulo desde el menú lateral (por ejemplo, «Cursos»), el enrutador de Angular carga el componente correspondiente (CursosComponent), el cual, durante su inicialización (ngOnInit), invoca un método del servicio inyectado (CursosService.listarCursos()). Este servicio, que encapsula la URL base de la API REST y las operaciones CRUD, construye una petición HTTP mediante el cliente HttpClient de Angular y la emite como un Observable de RxJS. La petición viaja al backend Spring Boot, que procesa la solicitud, interactúa con la base de datos y retorna una respuesta en formato JSON. El componente, suscrito al observable, recibe los datos y los asigna al arreglo que alimenta la tabla de PrimeNG, la cual se renderiza automáticamente en la vista. Las acciones de escritura (crear, editar, eliminar) siguen el mismo patrón, pero incluyen una capa adicional de retroalimentación visual al usuario mediante diálogos de SweetAlert2 (confirmaciones, alertas de éxito o mensajes de error).'),
      ],
    },

    // ╔═══════════════════════════════════════════════════════════════════════╗
    // ║  SECCIÓN 4 — MANUAL DE USUARIO                                      ║
    // ╚═══════════════════════════════════════════════════════════════════════╝
    {
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
      },
      children: [
        heading1('4. Manual de Usuario del Administrador'),
        new Paragraph({
          spacing: { after: 150 },
          shading: { type: ShadingType.SOLID, color: LGRIS },
          children: [
            new TextRun({ text: 'Nota: ', bold: true, size: 20, font: 'Aptos', color: AZUL }),
            new TextRun({ text: 'Este manual está dirigido al usuario administrador del sistema y emplea un lenguaje claro, accesible y no técnico. Las instrucciones describen los pasos operativos tal como se presentan en la interfaz del Panel Administrativo.', size: 20, font: 'Aptos', color: GRIS }),
          ],
        }),

        // ── 4.1 Cursos y Grupos ─────────────────────────────────────────
        heading2('4.1. Gestión de Cursos y Grupos'),

        heading3('4.1.1. Crear un nuevo curso'),
        numberedStep(1, 'En el menú lateral izquierdo del panel, haga clic en la opción «Cursos» dentro de la sección Académico.'),
        numberedStep(2, 'Se mostrará la pantalla principal de cursos con una tabla que lista todos los cursos registrados. En la esquina superior derecha, presione el botón «Nuevo Curso» (identificado con el ícono +).'),
        numberedStep(3, 'Se abrirá una ventana emergente (modal) con el formulario de registro. Complete los siguientes campos obligatorios:'),
        bulletRich([bold('Periodo: '), normal('seleccione el periodo académico correspondiente del desplegable (por ejemplo, 2026-I).')], 1),
        bulletRich([bold('Nivel: '), normal('elija el nivel educativo del curso: Primaria o Secundaria.')], 1),
        bulletRich([bold('Nombre del Curso: '), normal('escriba el nombre descriptivo del curso (por ejemplo: Aritmética, Álgebra, Razonamiento Verbal).')], 1),
        bulletRich([bold('Precio (S/): '), normal('ingrese el costo de matrícula del curso en soles peruanos.')], 1),
        numberedStepRich(4, [bold('Imagen del curso (opcional): '), normal('si desea asociar una imagen representativa al curso, presione el botón «Subir foto» y seleccione un archivo de imagen desde su computadora. Se mostrará una vista previa de la imagen seleccionada.')]),
        numberedStep(5, 'Una vez completados todos los campos, presione el botón «Guardar». El sistema registrará el curso y mostrará un mensaje de confirmación: «¡Guardado! El curso se registró correctamente.»'),
        numberedStep(6, 'El nuevo curso aparecerá automáticamente en la tabla principal.'),
        blankLine(),

        heading3('4.1.2. Editar un curso existente'),
        numberedStep(1, 'Ubique el curso que desea modificar en la tabla principal.'),
        numberedStep(2, 'En la columna de Acciones, haga clic en el ícono de lápiz (✏️). Se abrirá el formulario de edición precargado con los datos actuales del curso.'),
        numberedStep(3, 'Modifique los campos necesarios y presione «Guardar».'),
        blankLine(),

        heading3('4.1.3. Activar o desactivar un curso'),
        numberedStep(1, 'En la columna Estado de la tabla de cursos, cada registro cuenta con un interruptor deslizante (switch).'),
        numberedStep(2, 'Al presionarlo, el sistema le solicitará confirmación: «¿Activar curso?» o «¿Desactivar curso?».'),
        numberedStep(3, 'Confirme la acción. Un curso desactivado no estará disponible para nuevas inscripciones.'),
        blankLine(),

        heading3('4.1.4. Crear grupos (horarios) para un curso'),
        numberedStep(1, 'En la tabla de cursos, localice el curso al cual desea asignar horarios.'),
        numberedStep(2, 'Presione el botón «Horarios» (identificado con el ícono de calendario) en la columna de acciones del curso.'),
        numberedStep(3, 'Se abrirá una ventana emergente titulada «Gestión de Horarios: [nombre del curso]». En la parte superior encontrará el formulario «Registrar Nuevo Horario / Grupo» con los siguientes campos:'),
        bulletRich([bold('Nombre del Grupo: '), normal('escriba un nombre identificativo (por ejemplo: Grupo A, Turno Mañana, Aula 201).')], 1),
        bulletRich([bold('Días de Dictado: '), normal('seleccione uno o varios días de la semana haciendo clic en las opciones del menú desplegable múltiple (Lunes, Martes, etc.). Los días seleccionados se mostrarán como etiquetas (chips).')], 1),
        bulletRich([bold('Hora de Inicio y Hora de Fin: '), normal('ingrese el horario de la clase utilizando los selectores de hora.')], 1),
        bulletRich([bold('Vacantes: '), normal('indique la capacidad máxima de alumnos. El valor predeterminado es 30, pero puede modificarse con los botones de incremento/decremento.')], 1),
        numberedStep(4, 'Presione el botón «Agregar Grupo». El nuevo grupo aparecerá inmediatamente en la tabla inferior titulada «Horarios Disponibles».'),
        numberedStep(5, 'Repita este proceso para crear tantos grupos como horarios disponibles necesite el curso.'),
        blankLine(),

        heading3('4.1.5. Eliminar un grupo'),
        numberedStep(1, 'En la tabla de Horarios Disponibles dentro del modal de gestión de horarios, localice el grupo que desea remover.'),
        numberedStep(2, 'Presione el ícono de papelera (🗑️) en la columna de acciones. El grupo será eliminado del curso.'),
        blankLine(),

        // ── 4.2 Inscripciones ───────────────────────────────────────────
        heading2('4.2. Seguimiento de Inscripciones'),

        heading3('4.2.1. Visualizar el consolidado de inscripciones'),
        numberedStep(1, 'En el menú lateral, haga clic en la opción «Inscripciones».'),
        numberedStep(2, 'Se desplegará la pantalla «Control de Inscripciones», la cual muestra una tabla consolidada donde cada fila representa a un postulante y los cursos en los que se encuentra inscrito.'),
        numberedStep(3, 'La tabla presenta las siguientes columnas:'),
        bulletRich([bold('Carnet: '), normal('fotografía del postulante (o un ícono genérico si aún no tiene foto asignada).')], 1),
        bulletRich([bold('DNI: '), normal('documento nacional de identidad del alumno.')], 1),
        bulletRich([bold('Postulante: '), normal('apellidos y nombres completos.')], 1),
        bulletRich([bold('Cursos Asignados: '), normal('lista resumida de todos los cursos en los que el alumno está inscrito.')], 1),
        bulletRich([bold('Foto: '), normal('botón para actualizar la fotografía de carnet del alumno.')], 1),
        blankLine(),

        heading3('4.2.2. Buscar y filtrar inscripciones'),
        numberedStep(1, 'Utilice la barra de búsqueda ubicada en la parte superior de la tabla para buscar por DNI, nombre o apellido del postulante. Los resultados se filtrarán en tiempo real a medida que escriba.'),
        numberedStep(2, 'Utilice el selector de curso ubicado junto a la barra de búsqueda para mostrar únicamente los postulantes inscritos en un curso específico (por ejemplo: Aritmética). Para quitar el filtro, presione el ícono de limpieza (×) del selector.'),
        blankLine(),

        heading3('4.2.3. Ver el detalle de inscripciones de un postulante'),
        numberedStep(1, 'En la tabla principal, haga clic en el ícono de flecha (▶) ubicado al inicio de la fila del postulante.'),
        numberedStep(2, 'Se expandirá una sección inferior que muestra la tabla de detalle con la siguiente información por cada inscripción:'),
        bulletRich([bold('Fecha: '), normal('fecha en que se registró la inscripción (formato dd/mm/aaaa).')], 1),
        bulletRich([bold('Curso: '), normal('nombre del curso inscrito.')], 1),
        bulletRich([bold('Grupo: '), normal('nombre del grupo u horario asignado.')], 1),
        numberedStep(3, 'Para contraer la fila expandida, haga clic nuevamente en el ícono de flecha.'),
        blankLine(),

        heading3('4.2.4. Anular la inscripción de un alumno'),
        numberedStep(1, 'Expanda la fila del postulante como se indica en el paso anterior.'),
        numberedStep(2, 'En la tabla de detalle, localice la inscripción que desea anular.'),
        numberedStep(3, 'Presione el ícono de papelera (🗑️) en la columna correspondiente.'),
        numberedStep(4, 'El sistema le solicitará confirmación: «¿Anular esta inscripción? Se liberará la vacante.»'),
        numberedStep(5, 'Confirme la acción presionando «Sí, anular». La inscripción será removida y la vacante del grupo se liberará automáticamente.'),
        blankLine(),

        heading3('4.2.5. Registrar una nueva inscripción (matrícula)'),
        numberedStep(1, 'Desde la pantalla de Control de Inscripciones, presione el botón «Nueva Inscripción» (ícono +).'),
        numberedStep(2, 'El sistema mostrará un formulario guiado de tres pasos:'),
        blankLine(),
        para('Paso 1 — Seleccionar Postulante:', { bold: true, color: AZUL }),
        bullet('En el desplegable de búsqueda, escriba el DNI o nombre del alumno. El sistema filtrará los resultados en tiempo real.', 1),
        bullet('Seleccione al postulante. El sistema mostrará automáticamente el tipo de beca asignado al estudiante (si la tiene): Beca 100%, Semibeca 50% o Sin beca.', 1),
        bullet('El sistema verificará en segundo plano si el alumno ya tiene inscripciones previas.', 1),
        blankLine(),
        para('Paso 2 — Seleccionar Curso y Horario:', { bold: true, color: AZUL }),
        bullet('En el segundo desplegable, escriba o busque el curso deseado. Al seleccionarlo, se mostrará la cantidad de horarios disponibles.', 1),
        bullet('Presione el botón «Ver horarios» para abrir la ventana de selección de horarios.', 1),
        bullet('Se desplegará un modal con la lista de horarios disponibles. Cada horario muestra: nombre del grupo, rango de horas y vacantes restantes.', 1),
        bullet('Si el postulante ya está inscrito en un horario, se mostrará la etiqueta «Ya inscrito» y no podrá seleccionarlo nuevamente.', 1),
        bullet('Toque el horario deseado para seleccionarlo. El modal se cerrará automáticamente.', 1),
        blankLine(),
        para('Paso 3 — Resumen y Confirmación:', { bold: true, color: AZUL }),
        bullet('El sistema mostrará un resumen detallado con el curso, grupo, turno, precio original, descuento por beca (si aplica), costo del certificado y el total a pagar.', 1),
        bullet('Si el alumno tiene beca completa, se mostrará el aviso «Exonerado de pago».', 1),
        bullet('Presione el botón «Confirmar inscripción» para finalizar el proceso.', 1),
        blankLine(),
        numberedStep(3, 'El sistema procesará la matrícula y mostrará un mensaje de éxito con la opción de descargar el comprobante de matrícula en formato PDF.'),
        blankLine(),

        heading3('4.2.6. Actualizar la foto de carnet de un postulante'),
        numberedStep(1, 'En la tabla del consolidado de inscripciones, presione el botón «Cambiar» (ícono de cámara) en la columna Foto del postulante.'),
        numberedStep(2, 'En la ventana emergente, puede subir una foto desde su computadora o pegar la URL de una imagen de internet.'),
        numberedStep(3, 'Se mostrará una vista previa de la imagen. Presione «Guardar Carnet» para confirmar.'),
        blankLine(),

        // ── 4.3 Reportes ────────────────────────────────────────────────
        heading2('4.3. Reportes y Listas de Alumnos Matriculados por Aula'),

        heading3('4.3.1. Visualizar el padrón de alumnos inscritos en un grupo específico'),
        para('El sistema permite al administrador obtener la lista de alumnos matriculados en un grupo (aula/horario) específico mediante la siguiente secuencia:'),
        numberedStep(1, 'En el menú lateral, haga clic en «Cursos».'),
        numberedStep(2, 'En la tabla de cursos, localice el curso del cual desea consultar los alumnos inscritos.'),
        numberedStep(3, 'Presione el botón «Horarios» en la columna de acciones del curso.'),
        numberedStep(4, 'En la ventana de Gestión de Horarios, ubique el grupo (horario) que desea consultar en la tabla «Horarios Disponibles».'),
        numberedStepRich(5, [normal('Presione el ícono de '), bold('personas (👥)'), normal(' con la etiqueta «Ver inscritos» en la columna de acciones del grupo.')]),
        numberedStep(6, 'Se abrirá una nueva ventana emergente titulada «Lista de Alumnos», la cual presenta una tabla con las siguientes columnas:'),
        bulletRich([bold('DNI: '), normal('número de documento del alumno inscrito.')], 1),
        bulletRich([bold('Postulante: '), normal('apellidos y nombres completos.')], 1),
        bulletRich([bold('Fecha de Inscripción: '), normal('fecha en que el alumno fue matriculado en dicho grupo (formato dd/mm/aaaa).')], 1),
        numberedStep(7, 'Si el grupo no tiene alumnos inscritos, se mostrará el mensaje: «Aún no hay alumnos inscritos en este horario.»'),
        blankLine(),

        heading3('4.3.2. Funcionamiento técnico del reporte (referencia)'),
        new Paragraph({
          spacing: { after: 120 },
          shading: { type: ShadingType.SOLID, color: LGRIS },
          children: [italic('Esta sección es de carácter informativo y describe cómo se obtiene la información internamente.')],
        }),
        para('Cuando el administrador presiona el botón «Ver inscritos» de un grupo, el componente CursosComponent ejecuta el método verAlumnosDelGrupo(grupoId), el cual invoca al servicio InscripcionesService.listarPorGrupo(grupoId). Este servicio realiza una petición HTTP GET al endpoint:'),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 100 },
          shading: { type: ShadingType.SOLID, color: LGRIS },
          children: [new TextRun({ text: 'GET  /api/inscripciones/grupo/{grupoId}', bold: true, size: 22, font: 'Consolas', color: AZUL })],
        }),
        para('El backend (Spring Boot) procesa la solicitud, consulta la base de datos filtrando las inscripciones por el identificador del grupo solicitado y retorna un arreglo JSON con los registros de inscripción, cada uno de los cuales incluye el objeto estudiante (con DNI, nombres y apellidos) y la fecha de inscripción (enrollmentDate). El componente Angular recibe esta respuesta y la asigna al arreglo listaAlumnosGrupo, que alimenta la tabla renderizada dentro del diálogo modal.'),
        blankLine(),

        heading3('4.3.3. Tabla resumen de endpoints de reportería consumidos'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [
              headerCell('Operación', 22),
              headerCell('Método', 8),
              headerCell('Endpoint', 28),
              headerCell('Servicio Angular', 22),
              headerCell('Descripción', 20),
            ]}),
            new TableRow({ children: [
              dataCell('Listar alumnos por grupo', 22),
              dataCell('GET', 8, { bold: true }),
              codeCellContent('/api/inscripciones/grupo/{grupoId}', 28),
              dataCell('InscripcionesService.listarPorGrupo()', 22),
              dataCell('Inscripciones de un grupo/aula', 20),
            ]}),
            new TableRow({ children: [
              dataCell('Listar inscripciones por estudiante', 22),
              dataCell('GET', 8, { bold: true }),
              codeCellContent('/api/inscripciones/estudiante/{id}', 28),
              dataCell('InscripcionesService.listarPorEstudiante()', 22),
              dataCell('Inscripciones de un alumno', 20),
            ]}),
            new TableRow({ children: [
              dataCell('Listar grupos por curso', 22),
              dataCell('GET', 8, { bold: true }),
              codeCellContent('/api/grupos/curso/{cursoId}', 28),
              dataCell('GruposService.listarPorCurso()', 22),
              dataCell('Grupos/horarios de un curso', 20),
            ]}),
            new TableRow({ children: [
              dataCell('Listar todos los cursos', 22),
              dataCell('GET', 8, { bold: true }),
              codeCellContent('/api/cursos', 28),
              dataCell('CursosService.listarCursos()', 22),
              dataCell('Catálogo completo de cursos', 20),
            ]}),
            new TableRow({ children: [
              dataCell('Listar todas las inscripciones', 22),
              dataCell('GET', 8, { bold: true }),
              codeCellContent('/api/inscripciones', 28),
              dataCell('InscripcionesService.listarInscripciones()', 22),
              dataCell('Consolidado general', 20),
            ]}),
          ],
        }),
      ],
    },

    // ╔═══════════════════════════════════════════════════════════════════════╗
    // ║  SECCIÓN 5 — ANEXOS Y EVIDENCIAS                                    ║
    // ╚═══════════════════════════════════════════════════════════════════════╝
    {
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
      },
      children: [
        heading1('5. Anexos y Evidencias'),

        heading2('Anexo A — Captura del README.md del Repositorio Frontend'),
        ...capturaPlaceholder(
          '',
          'Captura de pantalla completa del archivo README.md del repositorio demo-frontend-olimpiadas (o frontend_administrable_olimpiadas_cti) tal como se visualiza en la plataforma GitHub o en el editor de código. La captura debe mostrar el título del proyecto, las instrucciones de instalación y ejecución del servidor de desarrollo (ng serve), y los comandos de compilación (ng build).'
        ),

        heading2('Anexo B — Capturas del Panel Administrativo en Ejecución'),

        ...capturaPlaceholder(
          'B.1. Pantalla de Inicio',
          'Captura de la pantalla de bienvenida del Panel Administrativo (/inicio) mostrando el menú lateral desplegado con las opciones de navegación (Inicio, Cursos, Estudiantes, Inscripciones), la barra superior con la fecha actual y el área de contenido con el mensaje de bienvenida.'
        ),
        ...capturaPlaceholder(
          'B.2. Módulo de Cursos — Vista de Tabla Principal',
          'Captura de la pantalla de gestión de cursos (/cursos) mostrando la tabla con al menos 3 cursos de prueba registrados. Deben ser visibles las columnas: imagen, nombre, nivel, periodo, precio y estado (activo/inactivo). Incluir el botón «Nuevo Curso» visible en la parte superior.'
        ),
        ...capturaPlaceholder(
          'B.3. Módulo de Cursos — Modal de Nuevo Curso',
          'Captura del formulario modal de creación de un nuevo curso, mostrando los campos de periodo, nivel, nombre del curso, precio e imagen (con datos de ejemplo ya ingresados).'
        ),
        ...capturaPlaceholder(
          'B.4. Módulo de Cursos — Gestión de Horarios/Grupos',
          'Captura del modal de Gestión de Horarios de un curso, mostrando el formulario para registrar un nuevo grupo y la tabla de Horarios Disponibles con al menos 2 grupos creados. Deben visualizarse las columnas de grupo, días, rango de horas y vacantes.'
        ),
        ...capturaPlaceholder(
          'B.5. Módulo de Cursos — Lista de Alumnos por Grupo',
          'Captura del modal Lista de Alumnos desplegado tras presionar el botón «Ver inscritos» de un grupo. Debe mostrar al menos 2 registros con columnas DNI, postulante y fecha de inscripción.'
        ),
        ...capturaPlaceholder(
          'B.6. Módulo de Inscripciones — Consolidado de Postulantes',
          'Captura de la pantalla de Control de Inscripciones (/inscripciones) mostrando la tabla consolidada con al menos 3 postulantes registrados. Debe visualizarse la barra de búsqueda, el filtro por curso y las columnas de carnet, DNI, postulante, cursos asignados y botón de foto. Incluir al menos una fila expandida.'
        ),
        ...capturaPlaceholder(
          'B.7. Módulo de Inscripciones — Formulario de Nueva Inscripción',
          'Captura del formulario guiado de nueva inscripción mostrando los tres pasos (Postulante, Curso y horario, Resumen) con datos de ejemplo seleccionados. De preferencia, mostrar un caso con descuento por beca para evidenciar el cálculo automático.'
        ),
        ...capturaPlaceholder(
          'B.8. Módulo de Inscripciones — Modal de Selección de Horarios',
          'Captura del modal de selección de horarios durante el proceso de nueva inscripción, mostrando la lista de horarios disponibles con precio, vacantes y el estado visual de un grupo ya inscrito (si aplica).'
        ),
        ...capturaPlaceholder(
          'B.9. Módulo de Estudiantes — Tabla y Formulario',
          'Captura de la pantalla de Estudiantes (/estudiantes) mostrando la tabla con al menos 3 registros y, superpuesto, el modal de creación/edición de un estudiante con el formulario de DNI, nombres, apellidos, correo y teléfono.'
        ),

        heading2('Anexo C — Estructura de Archivos del Proyecto Frontend'),
        blankLine(),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: 'demo-frontend-olimpiadas/', bold: true, size: 20, font: 'Consolas', color: DARK })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '├── src/', size: 20, font: 'Consolas', color: DARK })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '│   ├── app/', size: 20, font: 'Consolas', color: DARK })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '│   │   ├── pages/', size: 20, font: 'Consolas', color: DARK })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '│   │   │   ├── cursos/           → Gestión de cursos y grupos', size: 20, font: 'Consolas', color: GRIS })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '│   │   │   ├── estudiantes/      → CRUD de estudiantes', size: 20, font: 'Consolas', color: GRIS })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '│   │   │   ├── grupos/           → Componente de grupos (stub)', size: 20, font: 'Consolas', color: GRIS })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '│   │   │   ├── inicio/           → Pantalla de bienvenida', size: 20, font: 'Consolas', color: GRIS })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '│   │   │   └── inscripciones/    → Control de inscripciones', size: 20, font: 'Consolas', color: GRIS })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '│   │   │       └── nueva-inscripcion/  → Formulario de matrícula', size: 20, font: 'Consolas', color: GRIS })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '│   │   ├── services/', size: 20, font: 'Consolas', color: DARK })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '│   │   │   ├── cursos.service.ts', size: 20, font: 'Consolas', color: GRIS })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '│   │   │   ├── estudiantes.service.ts', size: 20, font: 'Consolas', color: GRIS })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '│   │   │   ├── grupos.service.ts', size: 20, font: 'Consolas', color: GRIS })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '│   │   │   ├── inscripciones.service.ts', size: 20, font: 'Consolas', color: GRIS })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '│   │   │   └── vps.service.ts', size: 20, font: 'Consolas', color: GRIS })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '│   │   ├── app.config.ts         → Configuración de Angular y PrimeNG', size: 20, font: 'Consolas', color: GRIS })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '│   │   ├── app.routes.ts         → Definición de rutas', size: 20, font: 'Consolas', color: GRIS })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '│   │   ├── app.html              → Layout principal (sidebar + topbar)', size: 20, font: 'Consolas', color: GRIS })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '│   │   └── app.ts               → Componente raíz', size: 20, font: 'Consolas', color: GRIS })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '│   └── styles.scss              → Estilos globales', size: 20, font: 'Consolas', color: GRIS })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '├── package.json', size: 20, font: 'Consolas', color: DARK })] }),
        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '└── angular.json', size: 20, font: 'Consolas', color: DARK })] }),

        blankLine(), blankLine(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 100 },
          children: [new TextRun({ text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', size: 22, color: AZUL })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: 'Fin del documento', bold: true, size: 22, font: 'Aptos', color: DARK })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [italic('Documento generado como parte de la actividad: «Elaboración de la documentación técnica integral final del módulo de cursos y manual de usuario» del proyecto Olimpiadas Escolares CTI.', 20)],
        }),
      ],
    },
  ],
});

// ── Generar archivo ─────────────────────────────────────────────────────────
const buffer = await Packer.toBuffer(doc);
const outputPath = './Documentacion_Tecnica_Modulo_Cursos_OlimpiadasCTI.docx';
fs.writeFileSync(outputPath, buffer);
console.log(`\n✅ Documento generado exitosamente: ${outputPath}\n`);
