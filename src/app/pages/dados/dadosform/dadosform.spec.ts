import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Dadosform } from './dadosform';

describe('Dadosform', () => {
  let component: Dadosform;
  let fixture: ComponentFixture<Dadosform>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dadosform]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Dadosform);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
