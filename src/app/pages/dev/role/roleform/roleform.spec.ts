import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Roleform } from './roleform';

describe('Roleform', () => {
  let component: Roleform;
  let fixture: ComponentFixture<Roleform>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Roleform]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Roleform);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
