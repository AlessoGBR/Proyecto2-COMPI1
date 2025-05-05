import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReporteAstComponent } from './reporte-ast.component';

describe('ReporteAstComponent', () => {
  let component: ReporteAstComponent;
  let fixture: ComponentFixture<ReporteAstComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReporteAstComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReporteAstComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
