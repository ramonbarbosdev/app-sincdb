import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExploradorVisual } from './explorador-visual';

describe('ExploradorVisual', () => {
  let component: ExploradorVisual;
  let fixture: ComponentFixture<ExploradorVisual>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExploradorVisual]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExploradorVisual);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
