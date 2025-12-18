import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateSystem } from './update-system';

describe('UpdateSystem', () => {
  let component: UpdateSystem;
  let fixture: ComponentFixture<UpdateSystem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateSystem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateSystem);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
