import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Planoassinaturaform } from './planoassinaturaform';

describe('Planoassinaturaform', () => {
  let component: Planoassinaturaform;
  let fixture: ComponentFixture<Planoassinaturaform>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Planoassinaturaform]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Planoassinaturaform);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
