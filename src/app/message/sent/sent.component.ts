import { Component, OnInit } from '@angular/core';
import * as _ from 'lodash';

import { ApiService } from '../../api.service';

@Component({
  selector: 'app-sent',
  templateUrl: './sent.component.html',
  styleUrls: ['./sent.component.css']
})
export class SentComponent implements OnInit {

  public simulations = [];

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.fetchMessages();
  }

  fetchMessages() {
    this.api.getSimulations().subscribe(res => {
      let simulations = res.json().messages;

      this.api.getSentMessages().subscribe(res => {
        let messages = res.json().messages;
        simulations.forEach(s => {
          s.message = _.find(messages, {id: s.id});
        })
      });

      this.simulations = simulations;
    });
  }
}
