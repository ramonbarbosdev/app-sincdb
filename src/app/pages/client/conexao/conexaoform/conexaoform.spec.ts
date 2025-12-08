import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Conexaoform } from './conexaoform';

describe('Conexaoform', () => {
  let component: Conexaoform;
  let fixture: ComponentFixture<Conexaoform>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Conexaoform]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Conexaoform);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
