import { Injectable } from '@angular/core';
import * as THREE from 'three';
import * as TrackballControls from 'three-trackballcontrols';
import * as moment from 'moment/moment';
import * as _ from 'lodash';

import { PlanetService } from './planet.service';
import { AssetService } from './asset.service';
import { StateService } from './state.service';

@Injectable()
export class RenderService {
  private initOnce = false;
  private DAY_MILLISECONDS = 24 * 60 * 60 * 1000;
  private DIFF_2000_1970 = moment('2000-01-01').diff('1970-01-01', 'ms') - 3600000 - 86400000
  private ASTRONOMICAL_UNIT = 149597870.7; //km
  public LIGHT_SPEED_AU = 299792.458 / this.ASTRONOMICAL_UNIT; /*km per sec*/

  public container;
  public camera;
  public controls;
  public scene;
  public renderer;
  public raycaster;
  public viewState = { scale: 1, parallaxes: [], enablePlanetScaling: false }
  public lastAnimation = new Date().getTime();
  public framerate = 20;

  constructor(private planets: PlanetService, private assets: AssetService, private state: StateService) { }

  init() {
    if (!this.initOnce) {
      this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 2000)
      this.camera.position.z = 1.5
      this.camera.far = 100000
      this.camera.near = 0.000001
      this.camera.updateProjectionMatrix()

      this.scene = new THREE.Scene()

      this.initBackground()

      for (let body of this.planets.planets) {
        this.initCelestialBody(body, true)
      }

      this.updatePositions()

      for (let body of this.planets.otherBodies) {
        this.initCelestialBody(body, false)
      }

      this.state.mouse = new THREE.Vector2();
      this.raycaster = new THREE.Raycaster();

      this.renderer = new THREE.WebGLRenderer({antialias: true, logarithmicDepthBuffer: true})
      this.renderer.setClearColor(0)
      this.renderer.setPixelRatio(window.devicePixelRatio)
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.initOnce = true;
    }

    this.controls = new TrackballControls( this.camera, this.container );
    //this.controls.addEventListener( 'change', this.render.bind(this) );

    this.container.appendChild(this.renderer.domElement)
  }

  animate() {
    let now = new Date().getTime();
    if (now - this.lastAnimation > 1000/this.framerate) {
      requestAnimationFrame(this.animate.bind(this))
      this.controls.update();
      this.render();
      this.lastAnimation = now;
    }
    else {
      setTimeout(this.animate.bind(this), 500/this.framerate);
    }
  }

  initBackground() {
    let geometry = new THREE.SphereGeometry(4000, 160, 90);
    let uniforms = {
      texture: { type: 't', value: this.assets.textures['background/Space.jpg'] }
    }

    let material = new THREE.ShaderMaterial( {
      uniforms:       uniforms,
      vertexShader:   document.getElementById('sky-vertex').textContent,
      fragmentShader: document.getElementById('sky-fragment').textContent
    })

    let skyBox = new THREE.Mesh(geometry, material)
    skyBox.scale.set(-1, 0.5, 0.9)
    skyBox.rotation.order = 'XZY'
    skyBox.renderDepth = 10000000.0
    this.scene.add(skyBox)

    let layers = [ //width, height, x, y, z
      [1280, 1273, 3, -12, -20],
      [1600, 1200, -9, 2, -14],
      [1600, 1200, -20, 8, -3],
      [1000, 750, 12, 3, -10],
      [1000, 713, 3, 2, -32]
    ]

    this.viewState.parallaxes = []

    for (let i = 0; i < 5; ++i) {
      let layer = layers[i]
      let tex = this.assets.textures[`background/Layer${i+1}.png`]
      let s = 0.01
      let geometry = new THREE.PlaneGeometry(layer[0]*s, layer[1]*s)
      let material = new THREE.MeshBasicMaterial( {map: tex, side: THREE.DoubleSide, transparent: true} );
      let plane = new THREE.Mesh(geometry, material)
      plane.position.x = layer[2]
      plane.position.y = layer[3]
      plane.position.z = layer[4]
      this.scene.add(plane)

      this.viewState.parallaxes.push({
        layer: layers[i],
        plane
      })
    }
  }

  initCelestialBody(params, isPlanet = false) {
    const [id, name, textureFilename, diameter, scale, orbDays] = params

    let mesh = this.assets.getBodyMesh(textureFilename, diameter, scale);
    this.scene.add(mesh)

    if (isPlanet) {
      this.state.planetNodes.push({id, mesh})

      this.scene.add(this.renderOrbit(id, orbDays))
    }
  }

  renderOrbit(id, orbDays) {
      const D = 1
      let geometry = new THREE.Geometry()
      let material = new THREE.LineBasicMaterial({ color: 0xFFFFFF })
      for (let d = 0, i = 0; d < orbDays; d += D, i += 3) {
        let pos = {x: 0, y: 0, z: 0}
        this.calcNodePosition(pos, id, d)
        geometry.vertices.push(new THREE.Vector3(pos.x, pos.y, pos.z))
      }

      return new THREE.Line(geometry, material);
  }

  initNode(id, loc) {
    let mesh = this.assets.getNodeMesh();

    mesh.position.x = loc.x
    mesh.position.y = loc.y
    mesh.position.z = loc.z
    this.scene.add(mesh)

    this.state.msgNodes.push({ id: id, mesh })
  }

  updatePositions() {
    for (let node of this.state.planetNodes) {
      this.updateNodePosition(node);
    }

    for (let msg of this.state.msgs) {
      if (this.shouldDisplayMessage(msg)) {
        this.updateMessagePosition(msg);
        this.addMessageToScene(msg);
      }
      else {
        this.removeMessageFromScene(msg);
      }
    }
  }

  addMessageToScene(msgObj) {
    this.scene.add(msgObj.mesh);
    msgObj.lines.forEach(line => { this.scene.add(line); });
  }

  removeMessageFromScene(msgObj) {
    this.scene.remove(msgObj.mesh);
    for (let line of msgObj.lines) {
      this.scene.remove(line);
    }
  }

  updateNodePosition(node) {
    let {mesh, id} = node
    this.calcNodePosition(mesh.position, id, this.state.currentDayFraction())

    let scale = this.viewState.scale

    mesh.position.x *= scale
    mesh.position.y *= scale
    mesh.position.z *= scale
  }

  calcNodePosition(outPos, id, d) {
    let orbs = this.planets.getOrbitals(id, d)

    let
    {n,i,w,a,e,m} = orbs,
      e2 = m + e * Math.sin(m) * (1.0 + e * Math.cos(m))

    let
    xv = a * (Math.cos(e2) - e),
      yv = a * (Math.sqrt(1.0 - e*e) * Math.sin(e2)),
      v = Math.atan2(yv, xv),
      r = Math.sqrt(xv*xv + yv*yv)

    let
    xh = r * ( Math.cos(n) * Math.cos(v+w) - Math.sin(n) * Math.sin(v+w) * Math.cos(i)),
      yh = r * ( Math.sin(n) * Math.cos(v+w) + Math.cos(n) * Math.sin(v+w) * Math.cos(i)),
      zh = r * ( Math.sin(v+w) * Math.sin(i) )

    outPos.x = xh
    outPos.y = yh
    outPos.z = zh
  }

  shouldDisplayMessage(msg) {
    let {mesh, 'lastBackendData':data} = msg
    let curTime = new Date().getTime();

    let lastReportNodeIndex = _.findIndex(data.path, {name: data.lastReport.name})
    let wasDelivered = lastReportNodeIndex >= data.path.length - 1

    return !wasDelivered
  }

  updateMessagePosition(msg) {
    let {mesh, 'lastBackendData': data} = msg
    let curTime = new Date().getTime();

    let curNodeIndex = _.findIndex(data.path, {name: data.lastReport.name})
    let distSinceProbableLastNode = (curTime - data.lastReport.time)/1000 * data.speedFactor * this.LIGHT_SPEED_AU

    let starts = data.path.slice(curNodeIndex, data.path.length-1);
    let ends = data.path.slice(curNodeIndex+1);
    let distances = _.map(_.zip(starts, ends), (n:any) => { return this.distance(n[0].location, n[1].location); });

    let guessIndex = 0;
    while (guessIndex < starts.length-1 && distSinceProbableLastNode >= distances[guessIndex]) {
      distSinceProbableLastNode -= distances[guessIndex];
      guessIndex++;
    }

    let factorBetweenNodes = Math.min(distSinceProbableLastNode / distances[guessIndex], 1);

    if (factorBetweenNodes) {
      this.lerpPos(mesh.position, starts[guessIndex].location, ends[guessIndex].location, factorBetweenNodes)
    }
  }

  onMessageUpdated(evt) {
    let msg = _.find(this.state.msgs, {id: evt.message.id})
    let messageUpdate = evt.message;

    if (msg) {
      if (msg.lastBackendData.lastReport.name != messageUpdate.lastReport.name) {
        this.removeMessageFromScene(msg);
        this.state.msgs.splice(this.state.msgs.indexOf(msg), 1);
        this.state.msgs.push(this.createNewMessageObject(messageUpdate));
      }
    }
    else {
      this.state.msgs.push(this.createNewMessageObject(messageUpdate));
    }
  }

  render() {
    this.updatePositions();

    //this.highlightOnMouseOver();

    this.renderer.render(this.scene, this.camera)
  }

  highlightOnMouseOver() {
    this.raycaster.setFromCamera(this.state.mouse, this.camera);
    //only take into account named objects - planets and messages
    let intersects = this.raycaster.intersectObjects(this.scene.children).filter(i => {return !!i.object.name;});

    if (intersects.length) {
      intersects.forEach(i => {
        if (!this.state.highlighted.slice(0).find(o => { return o.index == i.object.index })) {
          i.object.originalColor = i.object.material.color;
        }

        i.object.material.color = new THREE.Color(0xff0000);

        this.state.highlighted.push(i.object);
      });
    }
    else {
      this.state.highlighted.forEach(o => {o.material.color = o.originalColor});
      this.state.highlighted.splice(0);
    }
  }

  createNewMessageObject(msg) {
    let mesh = this.assets.getMessageMesh()
    mesh.name = msg.id

    let delivered = true;
    let lines = []
    for (let nodeIndex = 0; nodeIndex < msg.path.length-1; ++nodeIndex) {
      let curNode = msg.path[nodeIndex]
      let nextNode = msg.path[nodeIndex+1]
      if (curNode.name === msg.lastReport.name) {
        delivered = false;
      }

      let line = this.assets.prepareLineRender(msg.path[nodeIndex].location, msg.path[nodeIndex+1].location, delivered);
      lines.push(line)
    }

    return {
      id: msg.id,
      mesh,
      lines,
      lastBackendData: msg
    }
  }


  dayFractionToUnixTime(d) {
    return Math.floor(d * this.DAY_MILLISECONDS + this.DIFF_2000_1970)
  }

  lerpPos(outPos, pos1, pos2, factor) {
    outPos.x = +pos1.x + (+pos2.x - pos1.x) * factor
    outPos.y = +pos1.y + (+pos2.y - pos1.y) * factor
    outPos.z = +pos1.z + (+pos2.z - pos1.z) * factor
  }

  nodeDistance(nodes) {
    return this.distance(nodes[0].location, nodes[1].location);
  }

  distance(pos1, pos2) {
    const
    dx = pos2.x - pos1.x,
      dy = pos2.y - pos1.y,
      dz = pos2.z - pos1.z

    return Math.sqrt(dx*dx + dy*dy + dz*dz)
  }

  pointToVector3(p) {
    return new THREE.Vector3(p.x, p.y, p.z)
  }
}
