import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Rotapermissiondetail } from './rotapermissiondetail';

describe('Rotapermissiondetail', () => {
  let component: Rotapermissiondetail;
  let fixture: ComponentFixture<Rotapermissiondetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Rotapermissiondetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Rotapermissiondetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
