# --- STAGE 1: Compilación ---
    FROM node:20-alpine AS build
    WORKDIR /app
    COPY package*.json ./
    RUN npm install --legacy-peer-deps
    COPY . .
    RUN npm run build
    
    # --- STAGE 2: Servidor Nginx ---
    FROM nginx:alpine
    
    # Borramos los archivos por defecto de Nginx
    RUN rm -rf /usr/share/nginx/html/*
    
    # Copiamos todo el dist temporalmente
    COPY --from=build /app/dist /tmp/dist
    
    # TRUCO MÁGICO: Busca dónde está el index.html automáticamente y copia su contenido a Nginx
    RUN cp -r $(dirname $(find /tmp/dist -name "index.html" | head -n 1))/* /usr/share/nginx/html/
    
    # Configuración de rutas
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