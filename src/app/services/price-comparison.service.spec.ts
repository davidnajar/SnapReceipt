import { TestBed } from '@angular/core/testing';
import { PriceComparisonService } from './price-comparison.service';

describe('PriceComparisonService', () => {
  let service: PriceComparisonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PriceComparisonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not be initialized by default', () => {
    expect(service.isInitialized()).toBeFalsy();
  });

  it('should initialize with API key', () => {
    const mockApiKey = 'test-api-key-12345';
    expect(() => service.initialize(mockApiKey)).not.toThrow();
  });
});
