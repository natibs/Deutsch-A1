import { Component, signal, viewChild } from '@angular/core';
import { NatiUiModalComponent, NatiUiModalCloseEvent } from 'ui-components';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

// Generic yes/no confirmation, driven imperatively: open() resolves once the
// user picks a side (or dismisses, which counts as "no").
@Component({
  selector: 'app-confirm-modal',
  imports: [NatiUiModalComponent],
  templateUrl: './confirm-modal.html',
})
export class ConfirmModal {
  private readonly modal = viewChild.required<NatiUiModalComponent<boolean>>('modal');

  protected readonly title = signal('');
  protected readonly message = signal('');
  protected readonly confirmLabel = signal('Yes');
  protected readonly cancelLabel = signal('Cancel');

  private resolve?: (confirmed: boolean) => void;

  open(options: ConfirmOptions): Promise<boolean> {
    this.title.set(options.title);
    this.message.set(options.message);
    this.confirmLabel.set(options.confirmLabel ?? 'Yes');
    this.cancelLabel.set(options.cancelLabel ?? 'Cancel');
    this.modal().open();
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  protected confirm(): void {
    this.modal().close(true);
  }

  protected cancel(): void {
    this.modal().close(false);
  }

  protected onClosed(event: NatiUiModalCloseEvent<unknown>): void {
    this.resolve?.(event.data === true);
    this.resolve = undefined;
  }
}
