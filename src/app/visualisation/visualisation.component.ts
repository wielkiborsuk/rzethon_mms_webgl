import { Component, OnInit } from '@angular/core';
import { Http, Response, RequestOptionsArgs, Headers } from "@angular/http";
import * as _ from 'lodash';

import { PlanetService } from '../planet.service';
import { AssetService } from '../asset.service';
import { StateService } from '../state.service';
import { RenderService } from '../render.service';

@Component({
  selector: 'app-visualisation',
  templateUrl: './visualisation.component.html',
  styleUrls: ['./visualisation.component.css']
})
export class VisualisationComponent implements OnInit {
  private SIM_FETCH_INTERVAL = 5000;

  constructor(private render: RenderService, private state: StateService, private assets: AssetService, private http: Http) { }

  ngOnInit() {
    document.addEventListener('keydown', this.onKeyDown.bind(this), false)
    document.addEventListener('keyup', this.onKeyUp.bind(this), false)
    document.addEventListener('mousemove', this.onDocumentMouseMove.bind(this), false)
    document.addEventListener('mousedown', this.onDocumentMouseDown.bind(this), false)
    document.addEventListener('mouseup', this.onDocumentMouseUp.bind(this), false)
    document.addEventListener('mouseleave', this.onDocumentMouseLeave.bind(this), false)
    document.addEventListener('mousewheel', this.onDocumentMouseWheel.bind(this), false)
    window.addEventListener('resize', this.onWindowResize.bind(this), false)

    this.assets.preloadAssets().then(() => {
      this.render.init()
      this.render.animate()


      this.fetchNodes();
      this.fetchSimulation();
      setInterval(() => {
        this.fetchSimulation()
      }, this.SIM_FETCH_INTERVAL);

      setTimeout(() => {
        let earthPos = _.find(this.state.planetNodes, {id: 'earth'}).mesh.position
        let marsPos = _.find(this.state.planetNodes, {id: 'mars'}).mesh.position
        let venusPos = _.find(this.state.planetNodes, {id: 'venus'}).mesh.position

        let data = {
          id: "fjiof-fjioef-fejioef-fejio-fejio",
          path: [
            {name: "earth1", location: {x: earthPos.x, y: earthPos.y, z: earthPos.z}},
            {name: "mars1", location: {x: marsPos.x, y: marsPos.y, z: marsPos.z}},
            {name: "venus1", location: {x: venusPos.x, y: venusPos.y, z: venusPos.z}}
          ],
          lastReport: {
            name: 'earth1',
            time: null//to be calculated
          },
          speedFactor: 100,
          estimatedArrivalTime: 0 // to be calculated
        }

        let earthToMarsDist = this.render.distance(data.path[0].location, data.path[1].location)
        let marsToVenusDist = this.render.distance(data.path[1].location, data.path[2].location)
        let totalDist = earthToMarsDist + marsToVenusDist

        let earthToMarsTime = earthToMarsDist / (this.render.LIGHT_SPEED_AU*data.speedFactor) * 1000
        let flyTime = totalDist / this.render.LIGHT_SPEED_AU * 1000

        data.lastReport.time = (new Date().getTime())// - earthToMarsTime/2
        // lastBackendData.estimatedArrivalTime = new Date().getTime() + flyTime/2

        // onWebSocketData({
        //   message: data
        // })
      }, 1000)
    });
  }

  fetchNodes() {
    this.http.get(`${this.state.BACKEND_URL}/nodes`).subscribe(res => {
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
    this.http.get(`${this.state.BACKEND_URL}/simulations`).subscribe(res => {
      for (let msg of res.json().messages) {
        this.render.onMessageUpdated({message: msg})
      }
    })
  }

  onWindowResize() {
    this.render.windowHalfX = window.innerWidth / 2
    this.render.windowHalfY = window.innerHeight / 2

    this.render.camera.aspect = window.innerWidth / window.innerHeight
    this.render.camera.updateProjectionMatrix()

    this.render.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  onKeyDown(evt) {
    if (evt.key == 'o') {
      this.state.timeFactor /= 10
    }
    else if (evt.key == 'p') {
      this.state.timeFactor *= 10
    }
    else if (evt.key == 's') {
      this.render.viewState.enablePlanetScaling = !this.render.viewState.enablePlanetScaling
    }
    else if (evt.keyCode === 40/*arrow down*/) {
      this.state.isArrowDownDown = true
    }

    this.state.timeFactor = Math.max(1, this.state.timeFactor)
  }

  onKeyUp(evt) {
    if (evt.keyCode === 40/*arrow down*/) {
      this.state.isArrowDownDown = false
    }
  }

  onDocumentMouseMove(evt) {
    this.render.mouseX = (evt.clientX - this.render.windowHalfX)
    this.render.mouseY = (evt.clientY - this.render.windowHalfY)
  }

  onDocumentMouseDown(evt) {
    this.state.isLeftMouseButtonDown = true
  }

  onDocumentMouseUp(evt) {
    this.state.isLeftMouseButtonDown = false
  }

  onDocumentMouseLeave(evt) {
    this.state.isLeftMouseButtonDown = false
  }

  onDocumentMouseWheel(evt) {
    let z = this.render.camera.position.z + this.render.CAMERA_ZOOM_SPEED * Math.sign(evt.deltaY)

    // if (z < CAMERA_MAX_ZOOM) {
    //   z = CAMERA_MAX_ZOOM
    // }

    this.render.camera.position.z = z
    this.render.camera.updateProjectionMatrix()
  }
}
