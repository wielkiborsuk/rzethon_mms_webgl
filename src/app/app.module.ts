import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { routing } from './app.routes';
import { BsDropdownModule } from 'ng2-bootstrap';

import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { MessageComponent } from './message/message.component';
import { HeaderComponent } from './header/header.component';
import { AuthService } from './auth.service';
import { AuthGuardService } from './auth-guard.service';
import { PlanetService } from './planet.service';
import { AssetService } from './asset.service';
import { RenderService } from './render.service';
import { StateService } from './state.service';
import { VisualisationComponent } from './visualisation/visualisation.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    MessageComponent,
    HeaderComponent,
    VisualisationComponent
  ],
  imports: [
    routing,
    BrowserModule,
    FormsModule,
    HttpModule,
    BsDropdownModule.forRoot()
  ],
  providers: [AuthGuardService, AuthService, PlanetService, AssetService, RenderService, StateService],
  bootstrap: [AppComponent]
})
export class AppModule { }
