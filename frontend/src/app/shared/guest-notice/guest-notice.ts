import { Component, effect, input, output, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NatiUiModalComponent } from 'ui-components';

// Shown once per section visit, every time, for a signed-out visitor —
// starting the exercise is still allowed, but nothing about it will be saved.
@Component({
  selector: 'app-guest-notice',
  imports: [NatiUiModalComponent, RouterLink],
  templateUrl: './guest-notice.html',
  styleUrl: './guest-notice.scss',
})
export class GuestNotice {
  visible = input(false);
  continue = output<void>();

  private readonly modal = viewChild.required<NatiUiModalComponent>('modal');

  constructor() {
    effect(() => {
      if (this.visible()) this.modal().open();
    });
  }

  protected confirm(): void {
    this.modal().close();
    this.continue.emit();
  }
}
