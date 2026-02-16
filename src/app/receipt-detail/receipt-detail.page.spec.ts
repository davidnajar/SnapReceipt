import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReceiptDetailPage } from './receipt-detail.page';

describe('ReceiptDetailPage', () => {
  let component: ReceiptDetailPage;
  let fixture: ComponentFixture<ReceiptDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ReceiptDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
