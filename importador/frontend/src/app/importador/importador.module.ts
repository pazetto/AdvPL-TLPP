import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { PoModule } from '@po-ui/ng-components';
import { ImportadorComponent } from './importador.component';

const routes: Routes = [
  { path: '', component: ImportadorComponent }
];

@NgModule({
  declarations: [ImportadorComponent],
  imports: [
    CommonModule,
    FormsModule,
    PoModule,
    RouterModule.forChild(routes)
  ],
  exports: [ImportadorComponent]
})
export class ImportadorModule {}
