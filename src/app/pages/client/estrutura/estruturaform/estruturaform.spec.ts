import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Estruturaform } from './estruturaform';

describe('Estruturaform', () => {
  let component: Estruturaform;
  let fixture: ComponentFixture<Estruturaform>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Estruturaform]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Estruturaform);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
