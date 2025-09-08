import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { LoadingDialogService } from '../service/loading-dialog.service';

@Component({
    selector: 'app-loading-dialog',
    templateUrl: './loading-dialog.component.html',
    styleUrls: ['./loading-dialog.component.scss'],
})
export class LoadingDialogComponent {
    loading$: Observable<boolean>;

    constructor(private loadingService: LoadingDialogService) {
        this.loading$ = this.loadingService.loading$;
    }
}
