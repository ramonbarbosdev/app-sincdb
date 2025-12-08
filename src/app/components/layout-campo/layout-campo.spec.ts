import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayoutCampo } from './layout-campo';

describe('LayoutCampo', () => {
  let component: LayoutCampo;
  let fixture: ComponentFixture<LayoutCampo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutCampo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LayoutCampo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
