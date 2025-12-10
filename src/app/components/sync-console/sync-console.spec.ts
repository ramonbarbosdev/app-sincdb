import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SyncConsole } from './sync-console';

describe('SyncConsole', () => {
  let component: SyncConsole;
  let fixture: ComponentFixture<SyncConsole>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SyncConsole]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SyncConsole);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
