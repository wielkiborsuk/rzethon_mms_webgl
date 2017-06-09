import { Injectable } from '@angular/core';

@Injectable()
export class AuthService {

  private username;

  constructor() { }

  isLoggedIn () {
    return !!this.getCurrentUser();
  }

  getCurrentUser() {
    if (!this.username) {
      this.username = localStorage.getItem('username');
    }
    return this.username;
  }

  login (username: string) {
    localStorage.setItem('username', username);
    this.username = username;
  }

  logout () {
    delete this.username;
    localStorage.removeItem('username');
  }
}
