import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule, Routes } from '@angular/router';
import { PoModule } from '@po-ui/ng-components';
import { PoTemplatesModule } from '@po-ui/ng-templates';
import { ProtheusLibCoreModule } from '@totvs/protheus-lib-core';
import { AppComponent } from './app.component';
import { AuthGuard } from './auth.guard';
import { AuthInterceptor } from './auth.interceptor';
import { LoginComponent } from './login/login.component';

// Rota para "index.html" e recomendacao da doc oficial FwCallApp:
// https://tdn.totvs.com/display/public/framework/FwCallApp+-+Abrindo+aplicativos+Web+no+Protheus
const routes: Routes = [
  { path: '', redirectTo: 'importador', pathMatch: 'full' },
  { path: 'index.html', redirectTo: 'importador', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'importador',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./importador/importador.module').then(m => m.ImportadorModule)
  }
];

@NgModule({
  declarations: [AppComponent, LoginComponent],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule,
    HttpClientModule,
    PoModule,
    PoTemplatesModule,
    ProtheusLibCoreModule,
    RouterModule.forRoot(routes, { useHash: true })
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
