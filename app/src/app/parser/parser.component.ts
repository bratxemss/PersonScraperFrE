import {Component, inject, OnInit} from '@angular/core';
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
      <input list="users" autocomplete="on" type="text" (input)="onSearch($event)" placeholder="Twitter account" #xacc>
      <datalist id="users"></datalist>

      <button type="button" (click)="scrap(xacc.value, '')" [disabled]="isLoading">
        {{ isLoading ? 'Loading...' : 'Tell me about...' }}
      </button>
    </form>
    <div *ngIf="generatedText" class="generated_text">
      {{ generatedText }}
      <p></p>
      <button class="refresh-button" (click)="refreshGeneratedText()" [disabled]="isLoading">
        <div class="arrow">&#x21bb;</div>
      </button>
    </div>
  </div>

  <div class="right-panel">
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
          <p><strong>{{ user.login }} description:</strong> {{ user.user_description || 'No description available' }}</p>
          <p><strong> {{ user.login }}</strong>  : {{ user.user_gpt_response }}</p>
          <p><strong>Age:</strong> {{ user.user_assumed_age }}</p>
          <p><strong>MBTI:</strong> {{ user.user_assumed_mbti }}</p>
          <p><strong>Favorite word:</strong> '{{ user.user_most_popular_word }}' occurred {{ user.user_most_popular_word_count }} times</p>
          <h3>User Queries</h3>
          <ul *ngIf="user.queries.length > 0; else noQueries">
            <div *ngFor="let query of user.queries">
              <div class="query-data" (click)="query.showAnswer = !query.showAnswer">
                {{ query.Query }}
                <span class="icon">{{ query.showAnswer ? '▲' : '▼' }}</span>
              </div>
              <p *ngIf="query.showAnswer" [class.show]="query.showAnswer">
                <strong>Answer:</strong> {{ query.Query_answer }}
              </p>
            </div>
          </ul>
          <ng-template #noQueries>
            <p>No queries found.</p>
          </ng-template>
          <input type="text" placeholder="Data analysis task (optional)" #task (keydown.enter)="!isLoading && scrap(user.login, task.value)" [disabled]="isLoading" />

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
export class ParserComponent implements OnInit{
  http: HttpClient = inject(HttpClient);
  router: Router = inject(Router);
  token: string = '';
  generatedText: string = '';
  isLoading: boolean = false;
  users: any[] = [];
  chart: Chart | null = null;
  lettersAmount: string = '';
  lastXacc: string = '';
  lastTask: string = '';

  constructor(private cookieService: CookieService) {
    Chart.register(...registerables);
    if (this.cookieService.get('token')) {
      this.token = this.cookieService.get('token');
    }
  }

  populateDatalist() {
    const key = 'x_users';
    let users: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    let datalist = document.getElementById('users') as HTMLDataListElement;
    datalist.innerHTML = '';
    users.forEach(user => {
        let option = document.createElement('option');
        option.value = user;
        datalist.appendChild(option);
    });
}

  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;

    const isUserItem = target.closest('.user-item');
    const isUserDetails = target.closest('.user-details');

    if (!isUserItem && !isUserDetails) {

      this.users = this.users.map(user => ({ ...user, showDetails: false }));

      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
    }
  }

  ngOnInit() {
    this.populateDatalist();
    document.addEventListener('click', this.onClickOutside.bind(this));
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
      this.lettersAmount = '';
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

    if (this.lettersAmount && this.lettersAmount.length < value.length ){
      return
    }else{
      this.lettersAmount = ''
    }
    this.http.get(`http://localhost:8000/api/search/${value}`, { headers: myHeaders }).subscribe({
      next: (data: any) => {
        this.users = data.users.map((user: any, index:number) => ({
          ...user,
          showDetails: false,
          queries: data.users_queries[index] || []
        }));
        if (this.users.length == 1 && this.lettersAmount == ""){
          this.lettersAmount = value
        }
        console.log(this.users)
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
    } else {
      this.users = this.users.map(user => ({
        ...user,
        showDetails: user.login === login
      }));

      this.http.get(`http://localhost:8000/api/get_twits_data/${login}`, { headers: myHeaders }).subscribe({
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

  saveUserInCash(name: string) {
    const key = 'x_users';
    let users: string[] = JSON.parse(localStorage.getItem(key) || '[]');

    if (!users.includes(name)) {
        if (users.length >= 10) {
            users.shift();
        }
        users.push(name);
        localStorage.setItem(key, JSON.stringify(users));
    }
}

  async scrap(xacc: string, task: string, force:boolean=false) {
    if (!xacc.trim()) {
      alert('Please enter a valid account name');
      this.generatedText = 'Please enter a valid account name';
      return;
    }
    this.lastXacc = xacc;
    this.lastTask = task;
    const myHeaders = new HttpHeaders({
      Accept: 'application/json',
      Authorization: `Bearer ${this.token}`
    });

    this.isLoading = true;

    const user = this.users.find(u => u.login === xacc)

    this.saveUserInCash(xacc)
    this.populateDatalist()

    if (!task.trim() && user && !force){
      this.generatedText = user["user_gpt_response"]
      this.isLoading = false
      return
    }
    this.http.post(`http://localhost:8000/api/scrap/${xacc}`, { "task": task, "force": force }, { headers: myHeaders }).subscribe({
      next: (data: any) => {
        this.generatedText = data.text;
        this.isLoading = false;

        const inputEvent = new Event('input');
        const searchInput = document.querySelector('input[list="users"]') as HTMLInputElement;
        if (searchInput) {
            searchInput.value = xacc;
            searchInput.dispatchEvent(inputEvent);
        }
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
  async refreshGeneratedText() {
  if (!this.lastXacc) return; // Если данных нет, ничего не делаем
  await this.scrap(this.lastXacc, this.lastTask, true);
  }

  async logout() {
    this.cookieService.delete('token');
    this.router.navigate(['/']);
  }
}

