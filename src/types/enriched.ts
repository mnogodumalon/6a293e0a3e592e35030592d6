import type { Wartungsplan } from './app';

export type EnrichedWartungsplan = Wartungsplan & {
  maschineName: string;
};
