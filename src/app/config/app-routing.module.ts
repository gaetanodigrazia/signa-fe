import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../auth/guard/authGuard.guard';
import { LoginComponent } from '../pages/login/login.component';
import { HomeComponent } from '../pages/home/home.component';
import { PatientsComponent } from '../pages/patients/patients.component';
import { UsersComponent } from '../pages/users/users.component';
import { ArchivioComponent } from '../pages/archivio/archivio.component';
import { AppointmentCalendarComponent } from '../components/appointment-calendar/appointment-calendar.component';
import { AppuntamentiComponent } from '../pages/appuntamenti/appuntamenti.component';
import { EventoIniziatoComponent } from '../pages/evento-iniziato/evento-iniziato.component';
import { SettingsProfileComponent } from '../components/settings-profile/settings-profile.component';
import { SettingsStudioComponent } from '../components/settings-studio/settings-studio.component';
import { CanDeactivateSettingsProfileGuard } from './can-deactivate-settings-profile.guard';
import { AppointmentDetailsComponent } from '../components/appointment-details/appointment-details.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'home', component: HomeComponent, canActivate: [authGuard] },
    { path: 'evento-iniziato/:id', component: EventoIniziatoComponent, canActivate: [authGuard] },

    { path: 'patients', component: PatientsComponent, canActivate: [authGuard] },

    { path: 'users', component: UsersComponent, canActivate: [authGuard] },

    { path: 'archive', component: ArchivioComponent, canActivate: [authGuard] },

    { path: 'calendar', component: AppointmentCalendarComponent, canActivate: [authGuard] },

    { path: 'appointments', component: AppuntamentiComponent, canActivate: [authGuard] },
    { path: 'appointments/:id', component: AppointmentDetailsComponent, canActivate: [authGuard] },

    { path: 'users', component: UsersComponent, canActivate: [authGuard] },

    {
        path: 'settings', canActivate: [authGuard],
        children: [
            { path: 'profile', component: SettingsProfileComponent, canDeactivate: [CanDeactivateSettingsProfileGuard] },
            { path: 'studio', component: SettingsStudioComponent },
        ]
    },


    { path: '', pathMatch: 'full', redirectTo: 'home' },
    { path: '**', redirectTo: 'home' },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
