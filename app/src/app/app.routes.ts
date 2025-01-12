import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { ParserComponent} from './parser/parser.component';

const routeConfig: Routes = [
  {
    path: '',
    component: LoginComponent,
    title: 'Login'
  },
  {
    path: 'parse',
    component: ParserComponent,
    title: 'Parser'
  }
];

export default routeConfig;
