import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

export interface LoginForm {
  login: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  constructor(private auth: AuthService, private router: Router) { }

  loginForm: LoginForm = {
    login: ''
  };

  login() {
    if (this.loginForm.login) {
      this.auth.login(this.loginForm.login);
      this.router.navigate(['/']);
    }
  }

  ngOnInit() {
  }

}
