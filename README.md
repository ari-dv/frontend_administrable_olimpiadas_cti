# 🏅 Olimpiadas Escolares CTI - Frontend Público

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![PrimeReact](https://img.shields.io/badge/PrimeReact-06b6d4?style=for-the-badge&logo=primevideo&logoColor=white)

Plataforma web pública desarrollada para el **Centro en Tecnologías de Información (CTI)** de la UNSM. Este sistema permite a los estudiantes y padres de familia visualizar los resultados de los colegios de procedencia, explorar el catálogo de cursos disponibles y realizar su proceso de inscripción de manera intuitiva y optimizada.

## 🚀 Arquitectura y Tecnologías

El proyecto está construido bajo una arquitectura de Single Page Application (SPA) para garantizar tiempos de respuesta mínimos.
- Framework: React 19
- Bundler: Vite 8 (Hot Module Replacement ultrarrápido)
- Lenguaje: TypeScript (Tipado estático seguro)
- UI Kit: PrimeReact (Componentes accesibles y responsivos)
- Peticiones HTTP: Axios (Integración con API REST Spring Boot)
- Enrutamiento: React Router DOM v7

## ⚙️ Prerrequisitos

Asegúrate de tener instalados los siguientes entornos en tu máquina local antes de levantar el proyecto:
- Node.js (v18.0.0 o superior)
- npm (v9.0.0 o superior)

## 🛠️ Configuración de Variables de Entorno

Antes de iniciar la aplicación, crea un archivo .env en la raíz del proyecto basándote en el archivo .env.example:

VITE_API_URL=http://localhost:8080/api


## 📦 Instalación y Despliegue Local

1. Clonar el repositorio:
git clone https://github.com/tu-usuario/olimpiadas-cti-frontend.git

2. Navegar al directorio del proyecto:
cd olimpiadas-cti-frontend

3. Instalar las dependencias de NPM:
npm install

4. Levantar el servidor de desarrollo:
npm run dev

> La aplicación estará disponible por defecto en http://localhost:5173.

## 🏗️ Comandos de Producción

Para generar el empaquetado optimizado para despliegue en un servidor VPS (Nginx):

# Generar la carpeta /dist optimizada
npm run build

# Previsualizar el build en local
npm run preview

## 📂 Estructura del Proyecto

src/
 ├── assets/        # Imágenes, iconos y recursos estáticos
 ├── components/    # Componentes reutilizables (Botones, Tarjetas, Navbar)
 ├── pages/         # Vistas principales (Home, Cursos, Inscripción, Resultados)
 ├── services/      # Lógica de conexión con la API (Axios interceptors)
 ├── routes/        # Configuración de React Router
 └── utils/         # Funciones y helpers de formateo

## 📄 Licencia
Este proyecto es propiedad intelectual del Centro en Tecnologías de Información (CTI) - FISI - UNSM.
