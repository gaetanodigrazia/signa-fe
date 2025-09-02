import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { HomeComponent } from './pages/home/home.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { AppointmentCalendarComponent } from './components/appointment-calendar/appointment-calendar.component';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LoginComponent } from './pages/login/login.component';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AuthInterceptor } from './auth/auth.interceptor';
import { AppRoutingModule } from './config/app-routing.module';
import { ErrorModalComponent } from './components/shared/error-modal/error-modal.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { PatientPickerComponent } from './components/shared/patient-picker/patient-picker.component';
import { DoctorPickerComponent } from './components/shared/doctor-picker/doctor-picker.component';



@NgModule({
  declarations: [
    AppComponent,
    SidebarComponent,
    AppointmentCalendarComponent,
    LoginComponent,
    PatientPickerComponent,
    DoctorPickerComponent],
  imports: [
    ErrorModalComponent,
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatTooltipModule,
    MatButtonModule,
    CalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: adapterFactory,
    }),
    FormsModule,
    HttpClientModule
  ],
  exports: [
    AppointmentCalendarComponent
  ],
  bootstrap: [AppComponent],
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ]
})
export class AppModule { }