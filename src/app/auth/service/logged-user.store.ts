import { Injectable, signal, computed } from '@angular/core';
import { LoggedUserDto, UserSettingsDto } from '../model/auth.model';

@Injectable({ providedIn: 'root' })
export class LoggedUserStore {
    private _user = signal<LoggedUserDto | null>(null);

    readonly user = computed(() => this._user());
    readonly isAuthenticated = computed(() => !!this._user());
    readonly userSettings = computed<UserSettingsDto | null>(() => this._user()?.userSettings ?? null);
    readonly locale = computed(() => this._user()?.userSettings?.locale ?? 'it-IT');
    readonly timeFormat = computed(() => this._user()?.userSettings?.timeFormat ?? '24h');

    setLoggedUser(u: LoggedUserDto) { this._user.set(u); }

    patchUserSettings(patch: Partial<UserSettingsDto>) {
        const u = this._user();
        if (!u) return;
        const merged = { ...u.userSettings, ...patch } as UserSettingsDto;
        this._user.set({ ...u, userSettings: merged });
    }

    clear() { this._user.set(null); }
}
