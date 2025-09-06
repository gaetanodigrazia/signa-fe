
export type LocaleCode = 'it-IT' | 'en-GB';
export type TimeFormat = '12h' | '24h';

/**
 * DTO di INPUT per POST/PATCH (allineato al backend)
 */
export interface StudioMemberProfileUpdateDto {
    firstName?: string;
    lastName?: string;
    title?: string;
    email?: string;
    locale: LocaleCode;
    timeFormat: TimeFormat;
    settings?: Record<string, any>; // es. { profile: {...}, security: {...} }
}

/**
 * DTO di OUTPUT (GET). Mantengo robustezza:
 * - valori "piatti" se il BE li espone a top-level
 * - fallback dentro settings.profile / settings.security se presenti
 */
export interface StudioMemberSettingsDto {
    // profilo (se presenti a top-level)
    firstName?: string | null;
    lastName?: string | null;
    title?: string | null;
    email?: string | null;

    // preferenze
    locale: LocaleCode | null;
    timeFormat: TimeFormat | null;

    // sicurezza
    enable2fa?: boolean | null;
    enableAutoLogout?: boolean | null;
    autoLogoutMinutes?: number | null;

    // mirror JSON opzionale
    settings?: {
        profile?: {
            firstName?: string;
            lastName?: string;
            title?: string;
            email?: string;
            locale?: LocaleCode;
            timeFormat?: TimeFormat;
        };
        security?: {
            enable2fa?: boolean;
            enableAutoLogout?: boolean;
            autoLogoutMinutes?: number;
        };
        [k: string]: any;
    } | null;
}
