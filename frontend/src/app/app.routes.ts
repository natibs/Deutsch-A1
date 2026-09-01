import { Routes } from '@angular/router';
import { confirmQuizExitGuard } from './core/confirm-exit.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
    data: { mode: 'login' },
  },
  {
    path: 'signup',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
    data: { mode: 'signup' },
  },
  {
    path: '',
    loadComponent: () => import('./features/lektion-list/lektion-list').then((m) => m.LektionList),
  },
  {
    path: 'lektion/:id',
    loadComponent: () => import('./features/lektion-detail/lektion-detail').then((m) => m.LektionDetail),
  },
  {
    path: 'lektion/:id/vocabulary/:sectionIndex',
    loadComponent: () => import('./features/vocabulary-quiz/vocabulary-quiz').then((m) => m.VocabularyQuiz),
    canDeactivate: [confirmQuizExitGuard],
  },
  {
    path: 'lektion/:id/sentence',
    loadComponent: () => import('./features/sentence-builder/sentence-builder').then((m) => m.SentenceBuilder),
    canDeactivate: [confirmQuizExitGuard],
  },
  {
    path: 'lektion/:id/translation',
    loadComponent: () => import('./features/translation-quiz/translation-quiz').then((m) => m.TranslationQuiz),
    canDeactivate: [confirmQuizExitGuard],
  },
];
