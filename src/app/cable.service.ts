import { Injectable } from '@angular/core';
import { NotificationsService } from 'ng-notifications';
import * as ActionCable from 'actioncable';

import { StateService } from './state.service';
import { AuthService } from './auth.service';
import { RenderService } from './render.service';

@Injectable()
export class CableService {

  private cable;
  private deliveries;
  private simulations;

  constructor(private state: StateService, private auth: AuthService, private render: RenderService, private notifications: NotificationsService) { }

  init() {
    this.restart();
    this.auth.userChanged$.subscribe(username => this.restart());
    this.state.backendChanged$.subscribe(username => this.restart());
  }

  restart() {
    if (this.simulations) {
      this.simulations.unsubscribe();
      delete this.simulations;
    }

    if (this.deliveries) {
      this.deliveries.unsubscribe();
      delete this.deliveries;
    }

    if (this.cable) {
      this.cable.disconnect();
      delete this.cable;
    }

    this.cable = ActionCable.createConsumer(this.state.getWebsocketUrl());
    if (this.auth.getCurrentUser()) {
      this.deliveries = this.cable.subscriptions.create(
        { channel: 'DeliveryChannel', user: this.auth.getCurrentUser() },
        { received: data => {
          let msg = '';
          if (data.report) {
            let message = data.report;
            msg = `Twoja wiadomość do ${message.receiver} została dostarczona na ${message.destination}`
          } else {
            let message = data.message;
            msg = `Dostałeś wiadomość od ${message.sender} z ${message.source} o treści: ${message.content}`
          }
          this.notifications.success('Dostarczono', msg);
        } });

      this.simulations = this.cable.subscriptions.create(
        { channel: 'SimulationChannel', user: this.auth.getCurrentUser() },
        { received: data => {
          console.log(data);
          if (this.render.scene) {
            for (let msg of data.messages) {
              this.render.onMessageUpdated({message: msg});
            }
          }
        } });
    }
  }
}
