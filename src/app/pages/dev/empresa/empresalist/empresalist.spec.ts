import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Empresalist } from './empresalist';

describe('Empresalist', () => {
  let component: Empresalist;
  let fixture: ComponentFixture<Empresalist>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Empresalist]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Empresalist);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
