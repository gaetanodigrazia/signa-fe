// app/interceptor/alert-overrides.ts
import { APP_INITIALIZER, Provider } from '@angular/core';
import { ErrorModalService } from '../service/error-modal.service';

export function initAlertOverride(modal: ErrorModalService) {
    return () => {
        const originalAlert = window.alert.bind(window);
        (window as any).__originalAlert = originalAlert; // opzionale: per debug/ripristino

        window.alert = (message?: any) => {
            modal.open({
                title: 'Avviso',
                detail: String(message ?? ''),
                status: undefined
            });
        };
    };
}

export const ALERT_OVERRIDE_PROVIDER: Provider = {
    provide: APP_INITIALIZER,
    useFactory: initAlertOverride,
    deps: [ErrorModalService],
    multi: true
};
