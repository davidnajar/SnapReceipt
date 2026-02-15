import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { GeminiGuidePageRoutingModule } from './gemini-guide-routing.module';

import { GeminiGuidePage } from './gemini-guide.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    GeminiGuidePageRoutingModule
  ],
  declarations: [GeminiGuidePage]
})
export class GeminiGuidePageModule {}
