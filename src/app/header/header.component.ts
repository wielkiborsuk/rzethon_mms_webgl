import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationsService } from 'ng-notifications';

import { AuthService } from '../auth.service';
import { StateService } from '../state.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

  public options = {
    position: ['top', 'right'],
    timeOut: 5000,
    lastOnBottom: false,
    theClass: 'lowered'
  };

  constructor(private auth: AuthService, private router: Router, private state: StateService, private notifications: NotificationsService) { }

  ngOnInit() {
  }

  logout () {
    this.auth.logout();

    this.router.navigate(['/login']);
  }
}
