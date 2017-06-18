import { Component, OnInit } from '@angular/core';
import * as _ from 'lodash';

import { AuthService } from '../auth.service';
import { StateService } from '../state.service';
import { ApiService } from '../api.service';

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

  constructor(private auth: AuthService, private state: StateService, private api: ApiService) { }

  ngOnInit() {
    this.fetchDestinations();
  }

  fetchDestinations() {
    this.api.getNodes().subscribe(res => {
      this.nodes = res.json().nodes;
      this.message.destination = this.nodes[0].name;
    });
  }

  sendMessage() {
    this.message.speedFactor = this.state.speedFactor;
    this.api.sendMessage({'message': this.message}).subscribe(res => {
      this.lastMessage = res.json().message;
      this.api.getSimulations().subscribe(res => {
        this.lastMessage.deliveryTime = _.find(
          res.json().messages, m => { return m['id'] === this.lastMessage.id }
        )['deliveryTime'];
        this.lastMessage.timeRemaining = this.lastMessage.deliveryTime - new Date().getTime();
      });
    });
  }
}
