import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderListGenerico } from './header-list-generico';

describe('HeaderListGenerico', () => {
  let component: HeaderListGenerico;
  let fixture: ComponentFixture<HeaderListGenerico>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderListGenerico]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderListGenerico);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
