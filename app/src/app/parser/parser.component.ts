import { Component, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-parser',
  providers: [CookieService],
  imports: [CommonModule],
  template: `
   <section class="container">
      <div class="logout-button">
        <button type="button" (click)="logout()">Logout</button>
      </div>

      <div class="left-panel">
        <form onsubmit="return false;">
          <input type="text" placeholder="X account name" #xacc />
          <input type="text" placeholder="Data analysis task (optional)" #task />
          <button type="button" (click)="scrap(xacc.value, task.value)" [disabled]="isLoading">
            {{ isLoading ? 'Loading...' : 'Tell me about...' }}
          </button>
        </form>
        <div *ngIf="generatedText" class="generated_text">{{ generatedText }}</div>
      </div>

      <div class="right-panel">
        <form onsubmit="return false;">
          <input type="text" (input)="onSearch($event)" placeholder="Find user" />
          <p></p>
        </form>

        <div class="user-list">
          <select *ngIf="users.length >= 2" (change)="onSort($event)">
            <option value="name">Sort by Name</option>
            <option value="age">Sort by Age</option>
            <option value="date">Sort by Analysis Date</option>
          </select>
          <p></p>
          <div *ngFor="let user of users" class="user-item" (click)="toggleDetails(user.login)">
            <span class="user-login">{{ user.login }}</span>
            <div *ngIf="user.showDetails" class="user-details">
              <p><strong>Description:</strong> {{ user.user_description || 'No description available' }}</p>
              <p><strong>GPT Response:</strong> {{ user.user_gpt_response }}</p>
              <p><strong>Assumed Age:</strong> {{ user.user_assumed_age }}</p>
              <p><strong>Assumed MBTI:</strong> {{ user.user_assumed_mbti }}</p>
              <div class="chart-container">
                <canvas id="tweetsChart"></canvas>
            </div>
            </div>
          </div>
        </div>
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
  users: any[] = [];
  chart: Chart | null = null;

  constructor(private cookieService: CookieService) {
    Chart.register(...registerables);
    if (this.cookieService.get('token')) {
      this.token = this.cookieService.get('token');
    }
  }

  onSort(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.users.sort((a, b) => {
      if (value === 'name') return a.login.localeCompare(b.login);
      if (value === 'age') return +a.user_assumed_age - +b.user_assumed_age;
      if (value === 'date') return new Date(a.time_stamp).getTime() - new Date(b.time_stamp).getTime();
      return 0;
    });
  }

  async onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target?.value.trim();

    if (value?.length <= 1) {
      this.users = [];
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
    }
      return;
    }

    const myHeaders = new HttpHeaders({
      Accept: 'application/json',
      Authorization: `Bearer ${this.token}`
    });

    this.http.get(`https://www.libertylingo.com/api/search/${value}`, { headers: myHeaders }).subscribe({
      next: (data: any) => {
        this.users = data.users.map((user: any) => ({ ...user, showDetails: false }));
      },
      error: (error: any) => {
        console.error('Search error:', error);
        alert(`An error occurred: ${error.message || 'Unknown error'}`);
      }
    });
  }

  async toggleDetails(login: string) {
    const myHeaders = new HttpHeaders({
      Accept: 'application/json',
      Authorization: `Bearer ${this.token}`
    });

    const selectedUser = this.users.find(user => user.login === login);

    if (selectedUser?.showDetails) {
      this.users = this.users.map(user => ({
        ...user,
        showDetails: false
      }));
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
    } else {
      this.users = this.users.map(user => ({
        ...user,
        showDetails: user.login === login
      }));

      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }

      this.http.get(`https://www.libertylingo.com/api/get_twits_data/${login}`, { headers: myHeaders }).subscribe({
        next: (data: any) => {
          this.renderChart(this.processTweetData(data["data"]));
        },
        error: (error: any) => {
          console.error('Error fetching data:', error);
          alert(`An error occurred: ${error.message || 'Unknown error'}`);
        }
      });
    }
  }



private processTweetData(data: any[]): { labels: string[]; counts: number[] } {
  const dateCounts: { [key: string]: number } = {};
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  data.forEach(tweet => {
    const date = new Date(tweet.Tweet_data);
    const yearMonth = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

    if (dateCounts[yearMonth]) {
      dateCounts[yearMonth]++;
    } else {
      dateCounts[yearMonth] = 1;
    }
  });

  const labels = Object.keys(dateCounts).sort((a, b) => {
    const [monthA, yearA] = a.split(' ');
    const [monthB, yearB] = b.split(' ');
    const dateA = new Date(`${yearA}-${monthNames.indexOf(monthA) + 1}`);
    const dateB = new Date(`${yearB}-${monthNames.indexOf(monthB) + 1}`);
    return dateA.getTime() - dateB.getTime();
  });

  const counts = labels.map(label => dateCounts[label]);

  return { labels, counts };
}


  private renderChart(data: { labels: string[]; counts: number[] }) {
    const chartElement = document.getElementById('tweetsChart') as HTMLCanvasElement;

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(chartElement, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Number of Tweets',
            data: data.counts,
            backgroundColor: 'rgba(10,30,30,0.8)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true },
          tooltip: { enabled: true }
        },
        scales: {
          x: { title: { display: true, text: 'Year/Month' } },
          y: { title: { display: true, text: 'Number of Tweets' }, beginAtZero: true }
        }
      }
    });
  }

  async scrap(xacc: string, task: string) {
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

    this.http.post(`https://www.libertylingo.com/api/scrap/${xacc}`, { "task": task }, { headers: myHeaders }).subscribe({
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
