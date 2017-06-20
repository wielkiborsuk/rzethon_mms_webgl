import { Component, OnInit } from '@angular/core';
import * as _ from 'lodash';

import { ApiService } from '../../api.service';

@Component({
  selector: 'app-received',
  templateUrl: './received.component.html',
  styleUrls: ['./received.component.css']
})
export class ReceivedComponent implements OnInit {

  public messages = [];

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.fetchMessages();
  }

  fetchMessages() {
    this.api.getReceivedMessages().subscribe(res => {
      this.messages = res.json().messages;
    });
  }
}
