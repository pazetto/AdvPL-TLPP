import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler,
  HttpEvent, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ProAppConfigService } from '@totvs/protheus-lib-core';
import { AuthService } from './auth.service';

/**
 * Interceptor de FALLBACK para execucao standalone (ng serve). Quando embarcado
 * no Protheus via FwCallApp, a propria protheus-lib-core ja injeta o token JWT
 * do sessionStorage['ERPTOKEN'] e o host do appconfig.json - esse interceptor
 * apenas passa a request adiante nesse cenario.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private auth: AuthService,
    private router: Router,
    private proAppConfigService: ProAppConfigService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.proAppConfigService.insideProtheus()) {
      return next.handle(req);
    }

    const creds = this.auth.getCredentials();
    const authReq = creds
      ? req.clone({ setHeaders: { Authorization: `Basic ${creds}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401 || err.status === 428) {
          this.auth.logout();
          this.router.navigate(['/login']);
        }
        return throwError(() => err);
      })
    );
  }
}
