import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { CategorySummary } from '../../core/models';
import { PageHeaderService } from '../../core/page-header.service';

@Component({
  selector: 'app-practice-hub',
  imports: [RouterLink],
  templateUrl: './practice-hub.html',
  styleUrl: './practice-hub.scss',
})
export class PracticeHub {
  private readonly api = inject(ApiService);

  protected readonly categories = signal<CategorySummary[]>([]);

  constructor() {
    inject(PageHeaderService).set({
      title: 'AI Practice',
      backLink: '/',
      backLabel: '‹ All Lessons',
      subtitle: 'Sessions built from what you actually get wrong, grouped by topic',
    });

    this.api.getCategorySummaries().subscribe((categories) => this.categories.set(categories));
  }
}
