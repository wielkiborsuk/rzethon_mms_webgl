import { Injectable, EventEmitter } from '@angular/core';

@Injectable()
export class AuthService {

  private username: string;
  public userChanged$: EventEmitter<string>;

  constructor() {
    this.userChanged$ = new EventEmitter();
  }

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
    this.userChanged$.emit(username);
  }

  logout () {
    delete this.username;
    localStorage.removeItem('username');
    this.userChanged$.emit(null);
  }
}
