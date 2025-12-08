import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelecionarOrganizacao } from './selecionar-organizacao';

describe('SelecionarOrganizacao', () => {
  let component: SelecionarOrganizacao;
  let fixture: ComponentFixture<SelecionarOrganizacao>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelecionarOrganizacao]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelecionarOrganizacao);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
