import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayoutFormSimples } from './layout-form-simples';

describe('LayoutFormSimples', () => {
  let component: LayoutFormSimples;
  let fixture: ComponentFixture<LayoutFormSimples>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutFormSimples]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LayoutFormSimples);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
