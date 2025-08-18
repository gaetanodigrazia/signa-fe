export class Utils {

    static formatTime(date: Date): string {
        const h = String(date.getHours()).padStart(2, '0');
        const m = String(date.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
    }

    static toLocalOffsetISOString(d: Date): string {
        const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
        const y = d.getFullYear();
        const m = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hh = pad(d.getHours());
        const mm = pad(d.getMinutes());
        const ss = pad(d.getSeconds());

        const tz = -d.getTimezoneOffset();
        const sign = tz >= 0 ? '+' : '-';
        const tzh = pad(Math.floor(Math.abs(tz) / 60));
        const tzm = pad(Math.abs(tz) % 60);

        return `${y}-${m}-${day}T${hh}:${mm}:${ss}${sign}${tzh}:${tzm}`;
    }

    static combineDateAndTime(base: Date, time: string): Date {
        const [H, M] = (time || '09:00').split(':').map(Number);
        return new Date(base.getFullYear(), base.getMonth(), base.getDate(), H, M, 0, 0);
    }
}
