import { Component, OnInit } from '@angular/core';
import { Http, Response, RequestOptionsArgs, Headers } from "@angular/http";
import * as _ from 'lodash';

import { AuthService } from '../auth.service';
import { StateService } from '../state.service';

@Component({
  selector: 'app-message',
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.css']
})
export class MessageComponent implements OnInit {

  lastMessage;
  nodes = [];

  message = {
    sender: this.auth.getCurrentUser(),
    receiver: 'ThePilot',
    destination: 'EARTH#1.3',
    content: 'Draw me a lamb!',
    speedFactor: this.state.speedFactor
  }

  constructor(private http: Http, private auth: AuthService, private state: StateService) { }

  ngOnInit() {
    this.fetchDestinations();
  }

  fetchDestinations() {
    this.http.get(this.state.BACKEND_URL + '/nodes').subscribe(res => {
      this.nodes = res.json().nodes;
      this.message.destination = this.nodes[0].name;
    });
  }

  sendMessage() {
    this.message.speedFactor = this.state.speedFactor;
    this.http.post(this.state.BACKEND_URL + '/messages', {'message': this.message}).subscribe(res => {
      this.lastMessage = res.json().message;
      this.http.get(this.state.BACKEND_URL + '/simulations').subscribe(res => {
        this.lastMessage.deliveryTime = _.find(
          res.json().messages, m => { return m['id'] === this.lastMessage.id }
        )['deliveryTime'];
        this.lastMessage.timeRemaining = this.lastMessage.deliveryTime - new Date().getTime();
      });
    });
  }
}
