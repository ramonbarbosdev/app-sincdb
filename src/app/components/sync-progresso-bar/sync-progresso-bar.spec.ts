import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SyncProgressoBar } from './sync-progresso-bar';

describe('SyncProgressoBar', () => {
  let component: SyncProgressoBar;
  let fixture: ComponentFixture<SyncProgressoBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SyncProgressoBar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SyncProgressoBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
