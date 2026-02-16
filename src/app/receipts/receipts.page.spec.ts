import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReceiptsPage } from './receipts.page';

describe('ReceiptsPage', () => {
  let component: ReceiptsPage;
  let fixture: ComponentFixture<ReceiptsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ReceiptsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
