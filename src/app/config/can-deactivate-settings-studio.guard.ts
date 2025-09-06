import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { SettingsStudioComponent } from '../components/settings-studio/settings-studio.component';


@Injectable({ providedIn: 'root' })
export class CanDeactivateSettingsStudioGuard implements CanDeactivate<SettingsStudioComponent> {
    canDeactivate(component: SettingsStudioComponent) {
        return component.canDeactivate();
    }
}