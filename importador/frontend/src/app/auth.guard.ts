import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ProAppConfigService } from '@totvs/protheus-lib-core';
import { AuthService } from './auth.service';

/**
 * Quando o app esta rodando embarcado no Protheus (via FwCallApp), o token ja
 * foi carregado no sessionStorage['ERPTOKEN'] e a autenticacao eh feita pelo
 * interceptor da protheus-lib-core - pulamos a tela de login.
 * Em execucao standalone (ng serve), o AuthService garante o login manual.
 */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router,
    private proAppConfigService: ProAppConfigService
  ) {}

  canActivate(): boolean {
    if (this.proAppConfigService.insideProtheus()) {
      return true;
    }
    if (this.auth.isLoggedIn()) {
      return true;
    }
    this.router.navigate(['/login']);
    return false;
  }
}
