import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Lektion, ProgressRecord, SectionDescriptor, SectionType } from '../../core/models';
import { PageHeaderService } from '../../core/page-header.service';

const SECTION_DESCRIPTIONS: Record<SectionType, string> = {
  vocabulary: 'Choose the correct translation from 6 options',
  sentence: 'Arrange the scrambled words into a correct sentence',
  translation: 'Translate the Hebrew sentence into German',
};

const SECTION_COUNT_NOUNS: Record<SectionType, string> = {
  vocabulary: 'words',
  sentence: 'sentences',
  translation: 'sentences',
};

@Component({
  selector: 'app-lektion-detail',
  imports: [RouterLink],
  templateUrl: './lektion-detail.html',
  styleUrl: './lektion-detail.scss',
})
export class LektionDetail {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly pageHeader = inject(PageHeaderService);

  protected readonly descriptions = SECTION_DESCRIPTIONS;
  protected readonly countNouns = SECTION_COUNT_NOUNS;
  protected readonly lektion = signal<Lektion | null>(null);
  protected readonly sections = signal<SectionDescriptor[]>([]);
  protected readonly progress = signal<ProgressRecord[]>([]);

  protected readonly lektionId = this.route.snapshot.paramMap.get('id')!;

  protected readonly progressBySectionId = computed(() => {
    const map = new Map<string, ProgressRecord>();
    for (const record of this.progress()) {
      if (record.lektionId === this.lektionId) map.set(record.sectionId, record);
    }
    return map;
  });

  constructor() {
    this.api.getLektion(this.lektionId).subscribe((lektion) => {
      this.lektion.set(lektion);
      this.pageHeader.set({
        title: `Lesson ${lektion.number}`,
        backLink: '/',
        backLabel: '‹ All Lessons',
        subtitle: lektion.titleDe,
      });
    });
    this.api.getSections(this.lektionId).subscribe((sections) => this.sections.set(sections));
    this.loadProgress();
  }

  private loadProgress(): void {
    this.api.getProgress().subscribe((progress) => this.progress.set(progress));
  }

  protected sectionRoute(section: SectionDescriptor): string[] {
    return section.type === 'vocabulary' ? [section.type, String(section.index)] : [section.type];
  }

  protected markIncomplete(sectionId: string): void {
    this.api.setProgress(this.lektionId, sectionId, false).subscribe(() => this.loadProgress());
  }
}
