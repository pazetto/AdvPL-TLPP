import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PoNotificationService } from '@po-ui/ng-components';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent {
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private notification: PoNotificationService
  ) {}

  onLoginSubmit(event: { login: string; password: string }): void {
    this.loading = true;
    this.auth.login(event.login, event.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/importador']);
      },
      error: () => {
        this.loading = false;
        this.notification.error('Usuário ou senha inválidos. Verifique suas credenciais do Protheus.');
      }
    });
  }
}
