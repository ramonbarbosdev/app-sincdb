import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Usuariolist } from './usuariolist';

describe('Usuariolist', () => {
  let component: Usuariolist;
  let fixture: ComponentFixture<Usuariolist>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Usuariolist]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Usuariolist);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
