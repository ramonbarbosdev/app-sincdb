import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Usuarioform } from './usuarioform';

describe('Usuarioform', () => {
  let component: Usuarioform;
  let fixture: ComponentFixture<Usuarioform>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Usuarioform]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Usuarioform);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
