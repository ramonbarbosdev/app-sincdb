import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeClient } from './home-client';

describe('HomeClient', () => {
  let component: HomeClient;
  let fixture: ComponentFixture<HomeClient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeClient]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeClient);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
