import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { SettingsComponent } from '../pages/settings/settings.component';

@Injectable({ providedIn: 'root' })
export class CanDeactivateSettingsGuard implements CanDeactivate<SettingsComponent> {
    canDeactivate(component: SettingsComponent) {
        console.log('[Guard] canDeactivate chiamato. form.dirty =', component.form.dirty);
        return component.canDeactivate();
    }
}
