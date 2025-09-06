import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { SettingsProfileComponent } from '../components/settings-profile/settings-profile.component';

@Injectable({ providedIn: 'root' })
export class CanDeactivateSettingsProfileGuard implements CanDeactivate<SettingsProfileComponent> {
    canDeactivate(component: SettingsProfileComponent) {
        return component.canDeactivate();
    }
}