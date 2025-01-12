import {Component, inject} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {CookieService} from 'ngx-cookie-service';
import {CommonModule} from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-parser',
  providers: [CookieService],
  imports: [CommonModule],
  template: `
    <section>
      <div class="container">
        <form>
          <input type="text" placeholder="X account name" #xacc />
          <button class="primary" type="button" (click)="scrap(xacc.value)" [disabled]="isLoading">
            {{ isLoading ? 'Loading...' : 'Tell me about...' }}
          </button>
          <div *ngIf="isLoading" class="loading-spinner"></div>
          <div class="generated_text" [class.visible]="generatedText && !isLoading">{{ generatedText }}</div>
        </form>
      </div>
    </section>
    <section>
      <div class="logout">
        <button class="primary" type="button" (click)="logout()">Logout</button>
      </div>
    </section>
  `,
  styleUrls: ['./parser.component.css']
})
export class ParserComponent {
  http: HttpClient = inject(HttpClient);
  router: Router = inject(Router);
  token: string = '';
  generatedText: string = '';
  isLoading: boolean = false;

  constructor(private cookieService: CookieService) {
    if (this.cookieService.get('token')) {
      this.token = this.cookieService.get('token');
    }
  }

  async scrap(xacc: string) {
    if (!xacc.trim()) {
      alert('Please enter a valid account name');
      this.generatedText = 'Please enter a valid account name';
      return;
    }

    const myHeaders = new HttpHeaders({
      Accept: 'application/json',
      Authorization: `Bearer ${this.token}`
    });

    this.isLoading = true;

    this.http.get(`http://localhost:8000/api/scrap/${xacc}`, { headers: myHeaders }).subscribe({
      next: (data: any) => {
        this.generatedText = data.text;
        this.isLoading = false;
      },
      error: (error: any) => {
        this.isLoading = false;
        if (error.status === 0) {
          alert('Network error: Unable to connect to the server. Please try again later.');
          this.generatedText = 'Network error: Unable to connect to the server.';
        } else if (error.status === 404) {
          alert('Account not found. Please check the account name and try again.');
          this.generatedText = 'Account not found. Please check the account name.';
        } else if (error.status === 401) {
          alert('Unauthorized access. Please log in again.');
          this.generatedText = 'Unauthorized access. Please log in again.';
        } else {
          alert(`An error occurred: ${error.message || 'Unknown error'}`);
          this.generatedText = `Error: ${error.message || 'An unknown error occurred.'}`;
        }
      }
    });
  }

  async logout() {
    this.cookieService.delete('token');
    this.router.navigate(['/']);
  }
}
