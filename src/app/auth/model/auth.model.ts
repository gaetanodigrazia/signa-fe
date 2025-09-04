import { StudioRole } from "src/app/service/studiomembers.service";
export interface LoginSimpleResponse { id: string; studioRole: StudioRole, loggedUserDto: LoggedUserDto }

export type SubscriptionPlan = "FREE" | "BASIC" | "PRO" | "BUSINESS" | "ENTERPRISE";
export type SubscriptionStatus = "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" | "INCOMPLETE_EXPIRED";
export type TimeFormat = "12h" | "24h";

export type PageKey = "DASHBOARD" | "CALENDAR" | "PATIENTS" | "APPOINTMENTS" | "ANALYTICS" | "BILLING" | "SETTINGS" | "SUBSCRIPTION" | "USERS" | "DOCUMENTS";
export type ActionKey = "APPOINTMENT_CREATE" | "APPOINTMENT_EDIT" | "APPOINTMENT_DELETE" | "USER_SETTINGS_EDIT" | "STUDIO_SETTINGS_EDIT" | "PATIENT_DELETE" | "BILLING_VIEW";

export interface StudioPlanDto {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    periodStart?: string;   // ISO date string
    periodEnd?: string;     // ISO date string
    active: boolean;
    seats: number;
    features: Record<string, any>; // jsonb libero
}

export interface StudioSettingsDto {
    studioId: string;
    clinicName?: string;
    clinicPhone?: string;
    clinicAddress?: string;
    vatId?: string;
    iban?: string;
    settings: Record<string, any>; // jsonb libero
}

export interface UserSettingsDto {
    locale: string;         // es. "it-IT"
    timeFormat: TimeFormat;
    enable2fa?: boolean;
    enableAutoLogout?: boolean;
    autoLogoutMinutes: number;
    settings: Record<string, any>; // jsonb libero
}

export interface PermissionsDto {
    pages: PageKey[];
    actions: ActionKey[];
}

export interface LoggedUserDto {
    userId: string;
    studioId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: StudioRole;
    studioName: string;

    plan: StudioPlanDto;
    studioSettings: StudioSettingsDto;
    userSettings: UserSettingsDto;
    permissions: PermissionsDto;
}
