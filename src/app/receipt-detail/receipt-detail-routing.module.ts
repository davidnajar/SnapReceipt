import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ReceiptDetailPage } from './receipt-detail.page';

const routes: Routes = [
  {
    path: '',
    component: ReceiptDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReceiptDetailPageRoutingModule {}
