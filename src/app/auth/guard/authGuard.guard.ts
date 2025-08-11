// src/app/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

const LS_TOKEN = 'app_token';
const LS_LOCKED = 'app_locked';
const LS_RETURN_URL = 'app_locked_return_url';

export const authGuard: CanActivateFn = () => {
    const router = inject(Router);
    const isAuth = !!localStorage.getItem(LS_TOKEN);
    const locked = localStorage.getItem(LS_LOCKED) === 'true';

    // Salva la rotta richiesta per tornare dopo il login/sblocco
    const wanted = router.url || '/home';
    localStorage.setItem(LS_RETURN_URL, wanted);

    if (!isAuth) {
        router.navigate(['/login'], { replaceUrl: true });
        return false;
    }
    if (locked) {
        router.navigate(['/lock'], { replaceUrl: true });
        return false;
    }
    localStorage.removeItem(LS_RETURN_URL);
    return true;
};
