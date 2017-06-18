import { Component, OnInit } from '@angular/core';
import * as _ from 'lodash';

import { PlanetService } from '../planet.service';
import { AssetService } from '../asset.service';
import { StateService } from '../state.service';
import { RenderService } from '../render.service';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-visualisation',
  templateUrl: './visualisation.component.html',
  styleUrls: ['./visualisation.component.css']
})
export class VisualisationComponent implements OnInit {
  private SIM_FETCH_INTERVAL = 5000;
  private intervalHandle;

  constructor(private render: RenderService, private state: StateService, private assets: AssetService, private api: ApiService) { }

  ngOnInit() {
    this.render.container = document.getElementById('container')

    document.addEventListener('keydown', this.onKeyDown.bind(this), false)
    this.render.container.addEventListener('mousemove', this.onDocumentMouseMove.bind(this), false)
    window.addEventListener('resize', this.onWindowResize.bind(this), false)

    this.assets.preloadAssets().then(() => {
      this.render.init()
      this.render.animate()
      this.onWindowResize();

      this.fetchNodes();
      this.fetchSimulation();
      this.intervalHandle = setInterval(() => {
        this.fetchSimulation()
      }, this.SIM_FETCH_INTERVAL);
    });
  }

  ngOnDestroy() {
    clearInterval(this.intervalHandle);
    delete this.intervalHandle;
  }

  fetchNodes() {
    this.api.getNodes().subscribe(res => {
      for (let node of res.json().nodes) {
        const loc = {
          x: node.location_x,
          y: node.location_y,
          z: node.location_z
        }

        this.render.initNode(node.id, loc);
      }
    })
  }

  fetchSimulation() {
    this.api.getSimulations().subscribe(res => {
      for (let msg of res.json().messages) {
        this.render.onMessageUpdated({message: msg})
      }
    })
  }

  onWindowResize() {
    this.render.camera.aspect = window.innerWidth / window.innerHeight
    this.render.camera.updateProjectionMatrix()

    this.render.renderer.setSize(window.innerWidth, window.innerHeight)
    this.render.controls.handleResize();
  }

  onKeyDown(evt) {
    if (evt.key == 'o') {
      this.state.timeFactor = Math.max(1, this.state.timeFactor/10)
    }
    else if (evt.key == 'p') {
      this.state.timeFactor *= 10
    }
  }

  onDocumentMouseMove(evt) {
    let canvas = this.render.container.children[0];
    this.state.mouse.x = ( evt.clientX / window.innerWidth ) * 2 - 1;
    this.state.mouse.y = - ( (evt.clientY - 50) / window.innerHeight ) * 2 + 1;
    //magic number 50 taken from the top margin - maybe there's an option to take event coords relative to canvas?
  }
}
