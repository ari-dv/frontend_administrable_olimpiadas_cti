import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
// 1. Añadimos withInterceptorsFromDi y HTTP_INTERCEPTORS
import { provideHttpClient, withFetch, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura'; 
import { routes } from './app.routes';
import { ApiKeyInterceptor } from './services/api-key.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    
    // 3. Modificamos el HttpClient para que acepte interceptores de clase
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    
    // 4. Registramos tu interceptor
    { provide: HTTP_INTERCEPTORS, useClass: ApiKeyInterceptor, multi: true },
    
    provideAnimationsAsync(), 
    providePrimeNG({
      theme: {
        preset: Aura
      }
    })
  ]
};