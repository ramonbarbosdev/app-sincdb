import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Planoassinaturalist } from './planoassinaturalist';

describe('Planoassinaturalist', () => {
  let component: Planoassinaturalist;
  let fixture: ComponentFixture<Planoassinaturalist>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Planoassinaturalist]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Planoassinaturalist);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
