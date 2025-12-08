import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Empresaform } from './empresaform';

describe('Empresaform', () => {
  let component: Empresaform;
  let fixture: ComponentFixture<Empresaform>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Empresaform]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Empresaform);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
