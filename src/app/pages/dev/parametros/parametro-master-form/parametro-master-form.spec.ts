import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParametroMasterForm } from './parametro-master-form';

describe('ParametroMasterForm', () => {
  let component: ParametroMasterForm;
  let fixture: ComponentFixture<ParametroMasterForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParametroMasterForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParametroMasterForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
