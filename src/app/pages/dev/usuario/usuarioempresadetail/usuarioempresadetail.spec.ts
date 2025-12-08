import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Usuarioempresadetail } from './usuarioempresadetail';

describe('Usuarioempresadetail', () => {
  let component: Usuarioempresadetail;
  let fixture: ComponentFixture<Usuarioempresadetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Usuarioempresadetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Usuarioempresadetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
