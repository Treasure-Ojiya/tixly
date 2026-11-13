import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeroSearch } from './hero-search';

describe('HeroSearch', () => {
  let component: HeroSearch;
  let fixture: ComponentFixture<HeroSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroSearch]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeroSearch);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
