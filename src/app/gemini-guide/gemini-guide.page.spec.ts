import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GeminiGuidePage } from './gemini-guide.page';

describe('GeminiGuidePage', () => {
  let component: GeminiGuidePage;
  let fixture: ComponentFixture<GeminiGuidePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GeminiGuidePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
