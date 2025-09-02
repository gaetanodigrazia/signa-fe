import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../auth/guard/authGuard.guard';
import { LoginComponent } from '../pages/login/login.component';
import { HomeComponent } from '../pages/home/home.component';
import { PatientsComponent } from '../pages/patients/patients.component';
import { UsersComponent } from '../pages/users/users.component';
import { ArchivioComponent } from '../pages/archivio/archivio.component';
import { AppointmentCalendarComponent } from '../components/appointment-calendar/appointment-calendar.component';
import { SettingsComponent } from '../pages/settings/settings.component';
import { CanDeactivateSettingsGuard } from './can-deactivate-settings.guard';
import { AppuntamentiComponent } from '../pages/appuntamenti/appuntamenti.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'home', component: HomeComponent, canActivate: [authGuard] },

    { path: 'patients', component: PatientsComponent, canActivate: [authGuard] },

    { path: 'users', component: UsersComponent, canActivate: [authGuard] },

    { path: 'archive', component: ArchivioComponent, canActivate: [authGuard] },

    { path: 'calendar', component: AppointmentCalendarComponent, canActivate: [authGuard] },

    { path: 'appointments', component: AppuntamentiComponent, canActivate: [authGuard] },

    { path: 'users', component: UsersComponent, canActivate: [authGuard] },

    {
        path: 'settings',
        canActivate: [authGuard], component: SettingsComponent, canDeactivate: [CanDeactivateSettingsGuard]
    },


    { path: '', pathMatch: 'full', redirectTo: 'home' },
    { path: '**', redirectTo: 'home' },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
