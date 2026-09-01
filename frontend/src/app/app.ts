import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NatiUiToastComponent } from 'ui-components';
import { BackButtonService } from './core/back-button.service';
import { ThemeService } from './core/theme.service';
import { PageHeader } from './shared/page-header/page-header';
import { TimeOfDayBackground } from './shared/time-of-day-background/time-of-day-background';

@Component({
  imports: [RouterOutlet, PageHeader, NatiUiToastComponent, TimeOfDayBackground],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  // Injected here (root component) purely to instantiate it at app start —
  // its constructor effect must set the data-theme attribute immediately,
  // not lazily whenever something else happens to first use the service.
  private readonly theme = inject(ThemeService);

  constructor() {
    inject(BackButtonService).init();
  }
}
