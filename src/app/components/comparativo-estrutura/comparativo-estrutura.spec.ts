import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComparativoEstrutura } from './comparativo-estrutura';

describe('ComparativoEstrutura', () => {
  let component: ComparativoEstrutura;
  let fixture: ComponentFixture<ComparativoEstrutura>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComparativoEstrutura]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComparativoEstrutura);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
