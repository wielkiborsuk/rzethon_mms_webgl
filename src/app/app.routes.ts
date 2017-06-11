import { Routes, RouterModule } from '@angular/router';
import { ModuleWithProviders } from '@angular/core';
import { AuthGuardService } from './auth-guard.service';
import { LoginComponent } from './login/login.component';
import { MessageComponent } from './message/message.component';

import { VisualisationComponent } from './visualisation/visualisation.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent},
  { path: 'message', component: MessageComponent, canActivate: [AuthGuardService]},
  { path: '**', component: VisualisationComponent, canActivate: [AuthGuardService]}
];

export const routing: ModuleWithProviders = RouterModule.forRoot(routes);
