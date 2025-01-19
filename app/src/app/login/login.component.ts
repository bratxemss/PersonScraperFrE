import {Component, inject} from '@angular/core';
import { CookieService} from 'ngx-cookie-service';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-login',
  imports: [],
  template: `
    <section>
      <div class="container">
        <form>
          <div class="fields">
            <input type="text" autocomplete="email" placeholder="Email" #email /><br><br>
            <input type="text" placeholder="Password" #passw /><br><br>
          </div>
          <div class="buttons">
            <button class="primary" type="button" (click)="login(email.value, passw.value)">Login</button>
            <button class="primary" type="button" (click)="register(email.value, passw.value)">Register</button>
          </div>
        </form>
      </div>
    </section>
  `,
  styleUrl: './login.component.css'
})
export class LoginComponent {
  http: HttpClient = inject(HttpClient);


  constructor(private cookieService: CookieService, private router: Router) {
    if (this.cookieService.check('token')) {
      this.router.navigate(['/parse']);
      console.log('logged in');
    }
  }

  async login(email:string, passw:string) {
    const myHeaders = new HttpHeaders({"Accept": "application/json"});
    this.http.post('https://www.libertylingo.com/api/auth/login',
      {"email": email, "password": passw},
      {headers: myHeaders}
    ).subscribe({
      next: (data:any) => {
        console.log(data);
        this.cookieService.set('token', data['token']);
        this.router.navigate(['/parse']);
      },
      error: err => console.log(err)
    })

  }

  async register(email:string, passw:string) {
    const myHeaders = new HttpHeaders({"Accept": "application/json"});
    this.http.post('https://www.libertylingo.com/api/auth/register',
      {"email": email, "password": passw},
      {headers: myHeaders}
    ).subscribe({
      next: (data:any) => {
        console.log(data);
        this.cookieService.set('token', data['token']);
        this.router.navigate(['/parse']);
      },
      error: err => console.log(err)
    })
  }
}
