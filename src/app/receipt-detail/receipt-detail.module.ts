import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ReceiptDetailPageRoutingModule } from './receipt-detail-routing.module';

import { ReceiptDetailPage } from './receipt-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReceiptDetailPageRoutingModule
  ],
  declarations: [ReceiptDetailPage]
})
export class ReceiptDetailPageModule {}
