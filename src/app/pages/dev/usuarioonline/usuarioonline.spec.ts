import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Usuarioonline } from './usuarioonline';

describe('Usuarioonline', () => {
  let component: Usuarioonline;
  let fixture: ComponentFixture<Usuarioonline>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Usuarioonline]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Usuarioonline);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
