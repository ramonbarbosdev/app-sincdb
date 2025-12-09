import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadCertiicado } from './upload-certiicado';

describe('UploadCertiicado', () => {
  let component: UploadCertiicado;
  let fixture: ComponentFixture<UploadCertiicado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadCertiicado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UploadCertiicado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
