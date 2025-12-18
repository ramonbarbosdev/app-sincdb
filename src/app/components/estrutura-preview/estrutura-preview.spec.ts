import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstruturaPreview } from './estrutura-preview';

describe('EstruturaPreview', () => {
  let component: EstruturaPreview;
  let fixture: ComponentFixture<EstruturaPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstruturaPreview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstruturaPreview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
