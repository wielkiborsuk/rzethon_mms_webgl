import { Injectable } from '@angular/core';

@Injectable()
export class AuthService {

  private username;

  constructor() { }

  isLoggedIn () {
    return !!this.getCurrentUser();
  }

  getCurrentUser() {
    return this.username;
  }

  login (username: string) {
    this.username = username;
  }

  logout () {
    delete this.username;
  }
}
