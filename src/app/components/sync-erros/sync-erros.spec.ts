import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SyncErros } from './sync-erros';

describe('SyncErros', () => {
  let component: SyncErros;
  let fixture: ComponentFixture<SyncErros>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SyncErros]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SyncErros);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
