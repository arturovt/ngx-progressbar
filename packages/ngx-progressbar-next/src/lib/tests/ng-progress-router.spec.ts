import type { Mock } from "vitest";
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { NavigationStart, provideRouter, Router } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgProgressRef, NgProgressbar } from 'ngx-progressbar-next';
import { NG_PROGRESS_ROUTER_OPTIONS, NgProgressRouter, provideNgProgressRouter } from 'ngx-progressbar-next/router';

const CUSTOM_PROGRESS_DELAY: number = 200;

@Component({
    template: `
    <ng-progress ngProgressRouter/>
  `,
    imports: [NgProgressbar, NgProgressRouter]
})
class TestComponent {
}

@Component({
    selector: 'page-1',
    template: ''
})
export class Page1 {
}

@Component({
    selector: 'page-2',
    template: ''
})
export class Page2 {
}

describe('NgProgressRouter with partial options', () => {

    // The options are all optional, so the token can be provided directly
    // without the event lists. That must not break navigation.
    it('should ignore router events when the event lists are missing', async () => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: '', component: Page1 },
                    { path: 'page2', component: Page2 }
                ]),
                { provide: NG_PROGRESS_ROUTER_OPTIONS, useValue: { minDuration: CUSTOM_PROGRESS_DELAY } }
            ]
        }).compileComponents();

        const router: Router = TestBed.inject(Router);
        const fixture: ComponentFixture<TestComponent> = TestBed.createComponent(TestComponent);
        const progressRef: NgProgressRef = fixture.debugElement.query(By.directive(NgProgressRef)).injector.get(NgProgressRef);
        const startSpy: Mock = vi.spyOn(progressRef, 'start').mockReturnValue(undefined);

        fixture.detectChanges();
        await router.navigate(['page2']);
        fixture.detectChanges();

        expect(startSpy).not.toHaveBeenCalled();
        expect(progressRef.active()).toBe(false);
    });

    it('should still start the progress when only the complete events are missing', async () => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: '', component: Page1 },
                    { path: 'page2', component: Page2 }
                ]),
                {
                    provide: NG_PROGRESS_ROUTER_OPTIONS,
                    useValue: { minDuration: CUSTOM_PROGRESS_DELAY, startEvents: [NavigationStart] }
                }
            ]
        }).compileComponents();

        const router: Router = TestBed.inject(Router);
        const fixture: ComponentFixture<TestComponent> = TestBed.createComponent(TestComponent);
        const progressRef: NgProgressRef = fixture.debugElement.query(By.directive(NgProgressRef)).injector.get(NgProgressRef);
        const startSpy: Mock = vi.spyOn(progressRef, 'start').mockReturnValue(undefined);

        fixture.detectChanges();
        await router.navigate(['page2']);

        expect(startSpy).toHaveBeenCalled();
    });
});

describe(`NgProgressRouter`, () => {
    let fixture: ComponentFixture<TestComponent>;
    let progressRef: NgProgressRef;
    let router: Router;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: '', component: Page1 },
                    { path: 'page2', component: Page2 }
                ]),
                provideNgProgressRouter({
                    minDuration: CUSTOM_PROGRESS_DELAY
                })
            ]
        }).compileComponents();

        router = TestBed.inject(Router);
        fixture = TestBed.createComponent(TestComponent);
        progressRef = fixture.debugElement.query(By.directive(NgProgressRef)).injector.get(NgProgressRef);
    });

    it('should start/complete the progress bar on route change', async () => {
        const startSpy: Mock = vi.spyOn(progressRef, 'start').mockReturnValue(undefined);
        const completeSpy: Mock = vi.spyOn(progressRef, 'complete').mockReturnValue(undefined);

        fixture.detectChanges();

        router.navigate(['page2']).then(() => {
            fixture.detectChanges();
            setTimeout(() => {
                expect(completeSpy).toHaveBeenCalled();
                ;
            }, CUSTOM_PROGRESS_DELAY);
        });

        // Need a tiny delay to catch the start call
        setTimeout(() => {
            expect(startSpy).toHaveBeenCalled();
        });
    });
});
