// src/app/appointments/appointment-details.component.ts
import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AppointmentService } from 'src/app/service/appointment.service';
import { AppointmentDTO, AppointmentStatus } from 'src/app/model/appointment.model';

@Component({
  selector: 'app-appointment-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './appointment-details.component.html',
  styleUrls: ['./appointment-details.component.scss'],
})
export class AppointmentDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apptSvc = inject(AppointmentService);

  // stato UI
  loading = false;
  saving = false;
  error: string | null = null;

  // dati
  appt: AppointmentDTO | null = null;

  // modello cambio stato
  statusModel: { status: AppointmentStatus; result: string } = {
    status: 'BOOKED',
    result: '',
  };

  // visibilità esito (solo viewer)
  resultVisible = false;

  ngOnInit(): void {

    const id = this.route.snapshot.paramMap.get('id');
    /**
     *     if (fromState) {
          this.appt = fromState;
          this.statusModel = {
            status: fromState.status,
            result: (fromState as any)?.result || '',
          };
        }
    
        if (id && !fromState) {
          this.fetch(id);
        }
     */
    if (id) {
      this.fetch(id);
    }
  }

  private fetch(id: string) {
    this.loading = true;
    this.error = null;
    this.apptSvc.findById(id).subscribe({
      next: (a) => {
        this.appt = a;
        this.statusModel = {
          status: a.status,
          result: (a as any)?.result || '',
        };
      },
      error: (err) => {
        console.error(err);
        this.error = 'Errore nel caricamento dell’appuntamento.';
      },
      complete: () => (this.loading = false),
    });
  }

  /** Salva cambio stato (se CLOSED -> esito obbligatorio) */
  saveStatus() {
    if (!this.appt) return;
    const id = this.appt.id;
    const newStatus = this.statusModel.status;
    const needsResult = newStatus === 'CLOSED';

    if (needsResult && !this.statusModel.result?.trim()) {
      alert('Inserisci un esito per chiudere l’appuntamento.');
      return;
    }

    this.saving = true;

    const doUpdateStatus = () =>
      this.apptSvc.updateStatus(id, newStatus).subscribe({
        next: () => {
          // aggiorna UI locale
          this.appt = { ...this.appt!, status: newStatus, result: this.statusModel.result?.trim() || (this.appt as any).result };
          this.saving = false;
          alert('Stato aggiornato.');
        },
        error: (err) => {
          console.error('updateStatus error', err);
          this.saving = false;
          alert('Errore nel cambio stato.');
        },
      });

    if (needsResult) {
      this.apptSvc.insertResult(id, this.statusModel.result.trim()).subscribe({
        next: () => doUpdateStatus(),
        error: (err) => {
          console.error('insertResult error', err);
          this.saving = false;
          alert('Errore nel salvataggio dell’esito.');
        },
      });
    } else {
      doUpdateStatus();
    }
  }

  /** Apri pagina “evento iniziato” (se applicabile) */
  startVisit() {
    if (!this.appt?.id) return;
    this.router.navigate(['/evento-iniziato', this.appt.id], { state: { appt: this.appt } });
  }

  openResult() { this.resultVisible = true; }
  closeResult() { this.resultVisible = false; }

  back() { this.router.navigateByUrl('/'); }
}
