import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Rolelist } from './rolelist';

describe('Rolelist', () => {
  let component: Rolelist;
  let fixture: ComponentFixture<Rolelist>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Rolelist]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Rolelist);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
