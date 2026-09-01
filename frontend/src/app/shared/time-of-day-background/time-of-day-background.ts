import { Component } from '@angular/core';
import { getTimeOfDay } from '../../core/time-of-day';

// Fixed full-viewport gradient that sits behind every page, shifting with the
// visitor's local time of day; the "sun" moves and recolors to match.
@Component({
  selector: 'app-time-of-day-background',
  template: `
    <div
      class="time-of-day-bg"
      [class.dawn]="timeOfDay === 'dawn'"
      [class.morning]="timeOfDay === 'morning'"
      [class.midday]="timeOfDay === 'midday'"
      [class.afternoon]="timeOfDay === 'afternoon'"
      [class.evening]="timeOfDay === 'evening'"
      [class.night]="timeOfDay === 'night'"
    >
      <div class="sun" aria-hidden="true"></div>
    </div>
  `,
  styleUrl: './time-of-day-background.scss',
})
export class TimeOfDayBackground {
  protected readonly timeOfDay = getTimeOfDay(new Date().getHours());
}
