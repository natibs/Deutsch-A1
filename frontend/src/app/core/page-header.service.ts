import { Injectable, signal } from '@angular/core';

export interface HeaderInfo {
  title: string;
  part?: string;
  backLink?: string | unknown[] | null;
  backLabel?: string;
  subtitle?: string;
  hideAccountMenu?: boolean;
}

// A single shared instance so the header component can stay mounted once in
// the app shell instead of being torn down and recreated by every route —
// which was the source of the flicker between page navigations.
@Injectable({ providedIn: 'root' })
export class PageHeaderService {
  readonly info = signal<HeaderInfo>({ title: '' });

  set(info: HeaderInfo): void {
    this.info.set(info);
  }
}
