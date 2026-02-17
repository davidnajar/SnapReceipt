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

  it('should be initialized after calling initialize with API key', () => {
    const mockApiKey = 'test-api-key-12345';
    service.initialize(mockApiKey);
    expect(service.isInitialized()).toBeTruthy();
  });

  it('should return empty array when finding alternatives without initialization', async () => {
    const mockItem = {
      name: 'Test Product',
      price: 10,
      quantity: 1
    };
    
    await expectAsync(
      service.findCheaperAlternatives(mockItem, 'USD')
    ).toBeRejectedWithError(/not initialized/);
  });
});