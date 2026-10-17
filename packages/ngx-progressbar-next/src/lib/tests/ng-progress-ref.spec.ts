import type { Mock } from "vitest";
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgProgressRef } from 'ngx-progressbar-next';
import { defaultOptions } from '../ng-progress-default';

export async function afterTimeout(timeout: number): Promise<void> {
    // Use await with a setTimeout promise
    await new Promise<void>((resolve) => setTimeout(resolve, timeout));
}

describe('NgProgressRef', () => {
    let directive: NgProgressRef;
    let fixture: ComponentFixture<TestComponent>;

    beforeEach(() => {
        fixture = TestBed.createComponent(TestComponent);
        directive = fixture.debugElement.query(By.directive(NgProgressRef)).injector.get(NgProgressRef);
    });

    it('should initialize with the default config', () => {
        expect(directive.config()).toEqual({
            max: defaultOptions.max,
            min: defaultOptions.min,
            speed: defaultOptions.speed,
            trickleSpeed: defaultOptions.trickleSpeed,
            fadeOutSpeed: defaultOptions.fadeOutSpeed,
            trickleFunc: defaultOptions.trickleFunc,
            debounceTime: defaultOptions.debounceTime
        });
    });

    it('should start and complete the progress', async () => {
        directive.start();

        fixture.detectChanges();
        expect(directive.active()).toBe(true);
        expect(directive.progress()).toBe(0);

        await afterTimeout(350);
        fixture.detectChanges();
        expect(directive.progress()).toBeGreaterThan(10);

        directive.complete();
        fixture.detectChanges();

        await afterTimeout(20);
        expect(directive.progress()).toBe(100);
        await afterTimeout(350);
        expect(directive.active()).toBe(false);
    });

    it('should call continuously call set() on trickling', async () => {
        const setSpy: Mock = vi.spyOn(directive, 'set').mockReturnValue(undefined);
        // Assume active state is off
        directive['_active'].set(false);
        // Mock onTrickling call
        directive['onTrickling']({ min: 5 }).subscribe(() => {
            expect(setSpy).toHaveBeenCalledWith(5);
            ;
        });
    });

    it('should set the progress even if it has not started', async () => {
        // Assume active state is off
        directive.set(40);
        fixture.detectChanges();
        expect(directive.progress()).toBe(40);
        expect(directive.active()).toBe(true);

        directive.complete();
        fixture.detectChanges();
        await afterTimeout(350);
        expect(directive.active()).toBe(false);
    });

    it('should increment the progress when inc function is called', async () => {
        directive.inc();

        fixture.detectChanges();
        await afterTimeout(20);
        expect(directive.active()).toBe(true);
        expect(directive.progress()).toBeGreaterThan(0);
    });

    it('should emit the started and completed events', async () => {
        let startedEmitted: boolean = false;
        let completedEmitted: boolean = false;

        directive.started.subscribe(() => {
            startedEmitted = true;
        });

        directive.completed.subscribe(() => {
            completedEmitted = true;
        });

        directive.start();
        expect(startedEmitted).toBe(true);

        directive.complete();
        fixture.detectChanges();

        await afterTimeout(20);
        expect(completedEmitted).toBe(true);
    });

    it('should not do anything if complete() is called when progress has not started', () => {
        const completeSpy: Mock = vi.spyOn(directive, 'complete');
        directive.complete();
        fixture.detectChanges();
        expect(completeSpy).toHaveBeenCalled();
    });

    it('should set minimum value to 0 when given a value smaller than 0', async () => {
        fixture.componentInstance.min = -10;
        fixture.detectChanges();
        await afterTimeout(20);
        expect(directive.min()).toBe(0);
    });

    it('should set maximum value to 100 when given a value greater than 100', async () => {
        fixture.componentInstance.max = 200;
        fixture.detectChanges();
        await afterTimeout(20);
        expect(directive.max()).toBe(100);
    });

    it('should start/complete the progress using the start/complete functions', async () => {
        const startSpy: Mock = vi.spyOn(directive, 'start').mockReturnValue(undefined);
        const completeSpy: Mock = vi.spyOn(directive, 'complete').mockReturnValue(undefined);

        directive.start();
        expect(startSpy).toHaveBeenCalled();

        await afterTimeout(200);
        directive.complete();
        expect(completeSpy).toHaveBeenCalled();
    });

    it('should active signal when progress is started', async () => {
        directive.start();

        await afterTimeout(50);
        expect(directive.active()).toBe(true);
    });

    it('should increment the progress using inc function', () => {
        const incSpy: Mock = vi.spyOn(directive, 'inc').mockReturnValue(undefined);

        directive.inc(20);
        expect(incSpy).toHaveBeenCalledWith(20);
    });

    it('should increment the progress using set function', () => {
        const setSpy: Mock = vi.spyOn(directive, 'set').mockReturnValue(undefined);

        directive.set(50);
        expect(setSpy).toHaveBeenCalledWith(50);
    });
});

@Component({
    imports: [NgProgressRef],
    template: `
    <div ngProgressRef [min]="min" [max]="max"></div>
  `
})
class TestComponent {
    min: number;
    max: number;
}
