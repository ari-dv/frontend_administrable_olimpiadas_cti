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
    
    # Copiamos el contenido de la carpeta 'browser' (JS, CSS, imágenes, fuentes) a Nginx
    # Si no existe index.html pero sí index.csr.html (común en Angular SSR build), lo renombramos a index.html
    RUN BROWSER_DIR=$(find /tmp/dist -type d -name "browser" | head -n 1) && \
        if [ -n "$BROWSER_DIR" ] && [ -d "$BROWSER_DIR" ]; then \
            cp -r $BROWSER_DIR/* /usr/share/nginx/html/; \
            if [ ! -f /usr/share/nginx/html/index.html ] && [ -f /usr/share/nginx/html/index.csr.html ]; then \
                cp /usr/share/nginx/html/index.csr.html /usr/share/nginx/html/index.html; \
            fi \
        else \
            cp -r $(dirname $(find /tmp/dist -name "index.html" | head -n 1))/* /usr/share/nginx/html/; \
        fi
    
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