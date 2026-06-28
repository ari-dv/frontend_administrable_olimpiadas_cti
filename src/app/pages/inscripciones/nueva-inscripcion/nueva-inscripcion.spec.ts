import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevaInscripcion } from './nueva-inscripcion';

describe('NuevaInscripcion', () => {
  let component: NuevaInscripcion;
  let fixture: ComponentFixture<NuevaInscripcion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevaInscripcion],
    }).compileComponents();

    fixture = TestBed.createComponent(NuevaInscripcion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
