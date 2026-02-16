import { TestBed } from '@angular/core/testing';
import { ReceiptService } from './receipt.service';
import { SupabaseService } from './supabase.service';

describe('ReceiptService', () => {
  let service: ReceiptService;
  let supabaseServiceSpy: jasmine.SpyObj<SupabaseService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('SupabaseService', [
      'getSupabaseClient',
      'getCurrentUser',
      'isConfigured'
    ]);

    TestBed.configureTestingModule({
      providers: [
        ReceiptService,
        { provide: SupabaseService, useValue: spy }
      ]
    });

    service = TestBed.inject(ReceiptService);
    supabaseServiceSpy = TestBed.inject(SupabaseService) as jasmine.SpyObj<SupabaseService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should unsubscribe from all subscriptions on unsubscribeAll', () => {
    // This is a basic test - more comprehensive tests would require mocking Supabase client
    expect(() => service.unsubscribeAll()).not.toThrow();
  });
});
