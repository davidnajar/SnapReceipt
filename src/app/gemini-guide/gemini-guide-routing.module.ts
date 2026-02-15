import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { GeminiGuidePage } from './gemini-guide.page';

const routes: Routes = [
  {
    path: '',
    component: GeminiGuidePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GeminiGuidePageRoutingModule {}
