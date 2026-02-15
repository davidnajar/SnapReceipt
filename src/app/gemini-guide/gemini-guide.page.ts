import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-gemini-guide',
  templateUrl: './gemini-guide.page.html',
  styleUrls: ['./gemini-guide.page.scss'],
})
export class GeminiGuidePage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

  openGeminiStudio() {
    window.open('https://aistudio.google.com/app/apikey', '_blank');
  }

}

