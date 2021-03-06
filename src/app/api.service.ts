import { Injectable } from '@angular/core';
import { Http, Response, RequestOptionsArgs, Headers } from "@angular/http";

import { StateService } from './state.service';
import { AuthService } from './auth.service';

@Injectable()
export class ApiService {

  constructor(private state: StateService, private auth: AuthService, private http: Http) { }

  getNodes() {
    return this.http.get(`${this.state.getBackendUrl()}/nodes`, this.getOptions());
  }

  getSimulations() {
    return this.http.get(`${this.state.getBackendUrl()}/simulations`, this.getOptions());
  }

  getSentMessages() {
    return this.http.get(`${this.state.getBackendUrl()}/messages/sent`, this.getOptions());
  }

  getReceivedMessages() {
    return this.http.get(`${this.state.getBackendUrl()}/messages/received`, this.getOptions());
  }

  sendMessage(message) {
    return this.http.post(`${this.state.getBackendUrl()}/messages`, message, this.getOptions());
  }

  private getOptions() : RequestOptionsArgs {
    let headers = this.auth.isLoggedIn() ? new Headers({ 'Authorization': this.auth.getCurrentUser() }) : new Headers();
    return { headers : headers };
  }
}
