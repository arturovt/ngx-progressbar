import { InjectionToken, WritableSignal, signal } from '@angular/core';

export const NgProgressHttpCounter: InjectionToken<WritableSignal<number>> = new InjectionToken<WritableSignal<number>>('', {
  factory: () => signal(0),
});
