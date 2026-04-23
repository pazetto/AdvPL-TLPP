import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PoMenuItem, PoToolbarProfile } from '@po-ui/ng-components';
import { ProAppConfigService } from '@totvs/protheus-lib-core';

/**
 * Quando embarcado no Protheus (FwCallApp), o toolbar/menu proprio eh
 * suprimido para nao duplicar a navegacao do SmartClient - apenas o
 * conteudo do importador eh renderizado. Em modo standalone (ng serve),
 * o toolbar e o menu aparecem normalmente.
 */
@Component({
  selector: 'app-root',
  template: `
    <ng-container *ngIf="!isLoginPage && !embedded">
      <po-toolbar p-title="Importador Protheus" [p-profile]="profile"></po-toolbar>
      <po-menu [p-menus]="menus"></po-menu>
    </ng-container>
    <router-outlet></router-outlet>
  `
})
export class AppComponent {
  profile: PoToolbarProfile = {
    avatar: 'https://po-ui.io/assets/graphics/avatar.png',
    subtitle: 'importador@totvs.com',
    title: 'Usuario'
  };

  menus: PoMenuItem[] = [
    {
      label: 'Importador CSV',
      icon: 'po-icon po-icon-upload',
      link: '/importador',
      shortLabel: 'Importar'
    }
  ];

  constructor(
    private router: Router,
    private proAppConfigService: ProAppConfigService
  ) {}

  get isLoginPage(): boolean {
    return this.router.url.startsWith('/login');
  }

  get embedded(): boolean {
    return this.proAppConfigService.insideProtheus();
  }
}
