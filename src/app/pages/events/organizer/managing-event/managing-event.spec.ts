import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagingEvent } from './managing-event';

describe('ManagingEvent', () => {
  let component: ManagingEvent;
  let fixture: ComponentFixture<ManagingEvent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagingEvent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagingEvent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
