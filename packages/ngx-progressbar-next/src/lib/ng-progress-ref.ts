import {
  Directive,
  inject,
  NgZone,
  signal,
  effect,
  output,
  computed,
  untracked,
  numberAttribute,
  input,
  Signal,
  InputSignal,
  WritableSignal,
  OutputEmitterRef,
  EffectCleanupRegisterFn,
  InputSignalWithTransform
} from '@angular/core';
import { outputToObservable } from '@angular/core/rxjs-interop';
import {
  Observable,
  Subscriber,
  Subscription,
  MonoTypeOperatorFunction,
  BehaviorSubject,
  of,
  tap,
  delay,
  timer,
  filter,
  finalize,
  switchMap,
  takeUntil,
  EMPTY
} from 'rxjs';
import { NgProgressOptions, NG_PROGRESS_OPTIONS, NgProgressRefOptions } from './ng-progress.model';

enum TriggerType {
  START = 'START',
  COMPLETE = 'COMPLETE'
}

function minAttribute(value: string | number): number {
  const min: number = numberAttribute(value) || 0;
  return (min < 100 && min >= 0) ? min : 0;
}

function maxAttribute(value: string | number): number {
  const max: number = numberAttribute(value) || 100;
  return (max > 0 && max <= 100) ? max : 100;
}

/**
 * Detaches the source from the zone both when it is subscribed and when it
 * emits, since operators like delay build their timers on arrival.
 */
function leaveNgZone<T>(ngZone: NgZone): MonoTypeOperatorFunction<T> {
  return (source: Observable<T>) => new Observable<T>(
    (subscriber: Subscriber<T>) => ngZone.runOutsideAngular(() => source.subscribe({
      next: (value: T) => ngZone.runOutsideAngular(() => subscriber.next(value)),
      error: (error: unknown) => subscriber.error(error),
      complete: () => subscriber.complete()
    }))
  );
}

@Directive({
  selector: '[ngProgressRef]',
  exportAs: 'ngProgressRef'
})
export class NgProgressRef {

  private readonly ngZone: NgZone = inject(NgZone);

  private readonly defaultOptions: NgProgressOptions = inject(NG_PROGRESS_OPTIONS);

  min: InputSignalWithTransform<number, number | string> = input<number, number | string>(this.defaultOptions.min, { transform: minAttribute });
  max: InputSignalWithTransform<number, number | string> = input<number, number | string>(this.defaultOptions.max, { transform: maxAttribute });
  speed: InputSignalWithTransform<number, number | string> = input<number, number | string>(this.defaultOptions.speed, { transform: numberAttribute });
  trickleSpeed: InputSignalWithTransform<number, number | string> = input<number, number | string>(this.defaultOptions.trickleSpeed, { transform: numberAttribute });
  fadeOutSpeed: InputSignalWithTransform<number, number | string> = input<number, number | string>(this.defaultOptions.fadeOutSpeed, { transform: numberAttribute });
  debounceTime: InputSignalWithTransform<number, number | string> = input<number, number | string>(this.defaultOptions.debounceTime, { transform: numberAttribute });
  trickleFunc: InputSignal<(n: number) => number> = input(this.defaultOptions.trickleFunc);

  config: Signal<NgProgressRefOptions> = computed(() => {
    return {
      max: this.max(),
      min: this.min(),
      speed: this.speed(),
      trickleSpeed: this.trickleSpeed(),
      fadeOutSpeed: this.fadeOutSpeed(),
      trickleFunc: this.trickleFunc(),
      debounceTime: this.debounceTime()
    }
  });

  private _progress: WritableSignal<number> = signal<number>(0);

  private _active: WritableSignal<boolean> = signal<boolean>(false);

  active: Signal<boolean> = computed(() => this._active());

  progress: Signal<number> = computed(() => this._progress());

  // Progress start source event (used to cancel onComplete delays)
  started: OutputEmitterRef<void> = output<void>();

  // Progress ended source event
  completed: OutputEmitterRef<void> = output<void>();

  private _trigger: BehaviorSubject<TriggerType> = new BehaviorSubject<TriggerType>(null);

  constructor() {
    let sub$: Subscription;
    effect((onCleanup: EffectCleanupRegisterFn) => {
      const config: NgProgressOptions = this.config();

      untracked(() => {
        sub$ = this._trigger.pipe(
          filter((trigger: TriggerType) => !!trigger),
          switchMap((trigger: TriggerType) => {
            if (trigger === TriggerType.START) {
              return timer(config.debounceTime).pipe(
                switchMap(() => this.onTrickling(config))
              );
            }
            return this.onComplete(config);
          })
        ).subscribe();

        onCleanup(() => sub$?.unsubscribe());
      });
    });
  }

  /**
   * Start the progress
   */
  start(): void {
    this.started.emit();
    // The trigger builds the trickle timer synchronously, so emitting here
    // outside the zone keeps that timer out of change detection.
    this.ngZone.runOutsideAngular(() => {
      this._trigger.next(TriggerType.START);
    });
    this._active.set(true);
  }

  /**
   * Complete the progress
   */
  complete(): void {
    this.ngZone.runOutsideAngular(() => {
      this._trigger.next(TriggerType.COMPLETE);
    });
  }

  /**
   * Increment the progress
   */
  inc(amount?: number): void {
    const n: number = this.progress();
    if (!this.active()) {
      this.start();
    } else {
      if (typeof amount !== 'number') {
        amount = this.config().trickleFunc(n);
      }
      this.set(n + amount);
    }
  }

  /**
   * Set the progress
   */
  set(n: number): void {
    this._active.set(true);
    this._progress.set(this.clamp(n));
  }

  /**
   * Clamps a value to be between min and max
   */
  private clamp(n: number): number {
    return Math.max(this.config().min, Math.min(this.config().max, n));
  }

  /**
   * Keeps incrementing the progress
   */
  private onTrickling(config: NgProgressOptions): Observable<number> {
    if (!this.active()) {
      this.set(config.min);
    }
    return timer(0, config.trickleSpeed).pipe(tap(() => this.inc()));
  }

  /**
   * Completes then resets the progress
   */
  private onComplete(config: NgProgressOptions): Observable<unknown> {
    // If it's not active no need to complete
    if (!this.active()) {
      return EMPTY;
    }

    // Emit completed
    this.completed.emit();

    return of({}).pipe(
      // Complete the progress
      tap(() => this._progress.set(100)),
      // The effect can resubscribe this chain from inside the zone, so the
      // delays below are detached from it explicitly.
      leaveNgZone(this.ngZone),
      // Deactivate the progress after a tiny delay
      delay(config.speed + 140),
      tap(() => this._active.set(false)),

      leaveNgZone(this.ngZone),
      // Use a tiny delay before resetting
      delay(config.fadeOutSpeed),
      // Force the progress to reset even it got cancelled
      finalize(() => this._progress.set(0)),
      // Cancel any of the finalizing delays if the progress has started again
      takeUntil(outputToObservable(this.started))
    );
  }
}
