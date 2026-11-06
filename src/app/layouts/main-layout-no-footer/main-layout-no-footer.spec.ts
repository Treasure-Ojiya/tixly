import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainLayoutNoFooter } from './main-layout-no-footer';

describe('MainLayoutNoFooter', () => {
  let component: MainLayoutNoFooter;
  let fixture: ComponentFixture<MainLayoutNoFooter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayoutNoFooter],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayoutNoFooter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
