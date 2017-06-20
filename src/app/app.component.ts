import { Component } from '@angular/core';

import { CableService } from './cable.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(private cable: CableService) {}

  ngOnInit() {
    this.cable.init();
  }
}
