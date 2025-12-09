import { TestBed } from '@angular/core/testing';

import { ProgressoSyncService } from './progresso-sync-service';

describe('ProgressoSyncService', () => {
  let service: ProgressoSyncService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProgressoSyncService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
