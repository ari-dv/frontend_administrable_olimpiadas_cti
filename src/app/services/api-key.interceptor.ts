import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const apiReq = request.clone({
      headers: request.headers.set('X-API-KEY', 'CTI$Olimpiadas2026Demo!')
    });

    return next.handle(apiReq);
  }
}