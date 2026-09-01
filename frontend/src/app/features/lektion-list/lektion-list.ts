import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Lektion, ProgressRecord } from '../../core/models';
import { PageHeaderService } from '../../core/page-header.service';

@Component({
  selector: 'app-lektion-list',
  imports: [RouterLink],
  templateUrl: './lektion-list.html',
  styleUrl: './lektion-list.scss',
})
export class LektionList {
  private readonly api = inject(ApiService);

  protected readonly lektionen = signal<Lektion[]>([]);
  protected readonly progress = signal<ProgressRecord[]>([]);

  protected readonly lektionenWithProgress = computed(() =>
    this.lektionen().map((lektion) => {
      const records = this.progress().filter((p) => p.lektionId === lektion.id);
      const completedCount = records.filter((p) => p.completed).length;
      return { lektion, completedCount, totalSections: lektion.sectionCount };
    }),
  );

  constructor() {
    inject(PageHeaderService).set({
      title: 'German A1',
      subtitle: 'Practice from the book, lesson by lesson',
    });

    this.api.getLektionen().subscribe((lektionen) => this.lektionen.set(lektionen));
    this.api.getProgress().subscribe((progress) => this.progress.set(progress));
  }
}
