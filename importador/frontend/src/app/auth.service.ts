import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * AuthService de fallback para execucao STANDALONE (ng serve), fora do Protheus.
 * Quando o app roda embarcado via FwCallApp, o token JWT ja esta gravado em
 * sessionStorage['ERPTOKEN'] pela propria FwCallApp, e o interceptor da
 * protheus-lib-core injeta esse token em cada chamada - esse AuthService nao
 * eh usado nesse cenario.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly CREDS_KEY = 'protheus_creds';

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<any> {
    const encoded = btoa(`${username}:${password}`);
    const headers = new HttpHeaders({ Authorization: `Basic ${encoded}` });
    return new Observable(observer => {
      this.http.get('/rest99/zimportador/tabelas', { headers }).subscribe({
        next: res => {
          sessionStorage.setItem(this.CREDS_KEY, encoded);
          observer.next(res);
          observer.complete();
        },
        error: err => observer.error(err)
      });
    });
  }

  getCredentials(): string | null {
    return sessionStorage.getItem(this.CREDS_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getCredentials();
  }

  logout(): void {
    sessionStorage.removeItem(this.CREDS_KEY);
  }
}
