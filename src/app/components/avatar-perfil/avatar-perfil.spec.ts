import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvatarPerfil } from './avatar-perfil';

describe('AvatarPerfil', () => {
  let component: AvatarPerfil;
  let fixture: ComponentFixture<AvatarPerfil>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarPerfil]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvatarPerfil);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
