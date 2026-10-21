import {
  DestroyRef,
  Directive,
  inject,
  NgZone,
  PLATFORM_ID,
  type Type,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { type Event, Router } from '@angular/router';
import { NgProgressRef } from 'ngx-progressbar-next';
import { NG_PROGRESS_ROUTER_OPTIONS } from './ng-progress-router.model';

/**
 * Check if a router event type exists in an array of router event types.
 * The options are optional, so a caller providing the token directly can
 * leave either list out.
 */
function eventExists(
  routerEvent: Event,
  events: Type<Event>[] | undefined,
): boolean {
  return !!events?.some((e: Type<Event>) => routerEvent instanceof e);
}

@Directive()
class NgProgressRouterBase {
  readonly progressRef = inject(NgProgressRef, {
    host: true,
    self: true,
  });

  constructor() {
    // The router might break hydration since the server-rendered HTML would differ.
    if (
      (typeof ngServerMode !== 'undefined' && ngServerMode) ||
      isPlatformServer(inject(PLATFORM_ID))
    ) {
      return;
    }

    const ngZone = inject(NgZone);
    const { startEvents, completeEvents, minDuration } = inject(
      NG_PROGRESS_ROUTER_OPTIONS,
    );

    let completeTimeout: ReturnType<typeof setTimeout>;

    // Previously in v13, we had the router events toggle converted to a signal,
    // the issue with toSignal is when the new route is loaded too fast, it won't start the progressbar, causing the tests to break.
    // Therefore, we switched back to stream subscription to make sure it always starts and completes with the route events.
    const subscription = inject(Router).events.subscribe((event: Event) => {
      const isStart = eventExists(event, startEvents);

      if (!isStart && !eventExists(event, completeEvents)) {
        return;
      }

      clearTimeout(completeTimeout);

      if (isStart) {
        this.progressRef.start();
      } else {
        // Router events run inside the zone, so this timer would make
        // change detection wait on it.
        ngZone.runOutsideAngular(() => {
          completeTimeout = setTimeout(() => {
            this.progressRef.complete();
          }, minDuration);
        });
      }
    });

    inject(DestroyRef).onDestroy(() => {
      subscription.unsubscribe();
      clearTimeout(completeTimeout);
    });
  }
}

@Directive({
  selector: 'ng-progress[ngProgressRouter]',
})
export class NgProgressRouter extends NgProgressRouterBase {}

@Directive({
  selector: '[ngProgressRouter]:not(ng-progress)',
  hostDirectives: [NgProgressRef],
})
export class NgProgressRouterRef extends NgProgressRouterBase {}
