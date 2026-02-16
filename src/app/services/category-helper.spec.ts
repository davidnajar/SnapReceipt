import { TestBed } from '@angular/core/testing';

import { CategoryHelper } from './category-helper';

describe('CategoryHelper', () => {
  let service: CategoryHelper;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CategoryHelper);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
