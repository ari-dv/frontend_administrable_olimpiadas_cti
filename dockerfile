# --- STAGE 1: Compilación ---
    FROM node:20-alpine AS build
    WORKDIR /app
    COPY package*.json ./
    RUN npm install --legacy-peer-deps
    COPY . .
    RUN npm run build
    
    # --- STAGE 2: Servidor Nginx ---
    FROM nginx:alpine
    
    # 1. Borramos los archivos por defecto de Nginx para que no estorben
    RUN rm -rf /usr/share/nginx/html/*
    
    # 2. Copiamos el contenido de la carpeta browser que genera Angular 21
    COPY --from=build /app/dist/demo-frontend-olimpiadas/browser /usr/share/nginx/html
    
    # 3. Configuración de rutas
    RUN echo 'server { \
        listen 80; \
        location / { \
            root /usr/share/nginx/html; \
            index index.html index.htm; \
            try_files $uri $uri/ /index.html; \
        } \
    }' > /etc/nginx/conf.d/default.conf
    
    EXPOSE 80
    CMD ["nginx", "-g", "daemon off;"]