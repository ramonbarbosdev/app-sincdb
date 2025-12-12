import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoAtividades } from './info-atividades';

describe('InfoAtividades', () => {
  let component: InfoAtividades;
  let fixture: ComponentFixture<InfoAtividades>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoAtividades]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InfoAtividades);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
