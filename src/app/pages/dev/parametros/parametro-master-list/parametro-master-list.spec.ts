import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParametroMasterList } from './parametro-master-list';

describe('ParametroMasterList', () => {
  let component: ParametroMasterList;
  let fixture: ComponentFixture<ParametroMasterList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParametroMasterList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParametroMasterList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
