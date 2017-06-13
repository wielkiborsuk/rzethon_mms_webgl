import { Injectable } from '@angular/core';
import * as THREE from 'three';
import * as moment from 'moment/moment';
import * as _ from 'lodash';

import { PlanetService } from './planet.service';
import { AssetService } from './asset.service';
import { StateService } from './state.service';

@Injectable()
export class RenderService {
  private initOnce = false;
  private PLANET_RADIUS_SCALE = 0.0000004;
  private DAY_MILLISECONDS = 24 * 60 * 60 * 1000;
  private DIFF_2000_1970 = moment('2000-01-01').diff('1970-01-01', 'ms') - 3600000 - 86400000
  private ASTRONOMICAL_UNIT = 149597870.7; //km
  private NODE_RADIUS = 0.05;
  public LIGHT_SPEED_AU = 299792.458 / this.ASTRONOMICAL_UNIT; /*km per sec*/
  public CAMERA_ZOOM_SPEED = 0.08*4;

  public container;
  public camera;
  public scene;
  public renderer;
  public viewState = { scale: 1, parallaxes: [], enablePlanetScaling: false }
  public mouseX = 0;
  public mouseY = 0;
  public windowHalfX = window.innerWidth / 2;
  public windowHalfY = window.innerHeight / 2;

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

    this.renderer = new THREE.WebGLRenderer({antialias: true, logarithmicDepthBuffer: true})
    this.renderer.setClearColor(0)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.initOnce = true;
    }

    this.container.appendChild(this.renderer.domElement)
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this))
    this.render()
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
    let texture = this.assets.textures[textureFilename]
    let geometry = new THREE.SphereGeometry(this.PLANET_RADIUS_SCALE * diameter * scale, 20, 20)
    let material = new THREE.MeshBasicMaterial({ map: texture, transparent: true })
    let mesh = new THREE.Mesh(geometry, material)

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
    let texture = this.assets.textures["Node.png"]
    let geometry = new THREE.SphereGeometry(this.NODE_RADIUS, 40, 40)
    let material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.6 })
    let mesh = new THREE.Mesh(geometry, material)
    mesh.material.depthTest = false;
    mesh.renderOrder = 2;

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
      this.updateMessagePosition(msg);
      if (this.shouldDisplayMessage(msg)) {
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
    //FIXME - this will be able to depend on backends information on estimated delivery time
    let {mesh, 'lastBackendData':data} = msg
    let curTime = new Date().getTime();

    let lastReportNodeIndex = _.findIndex(data.path, {name: data.lastReport.name})
    let wasDelivered = lastReportNodeIndex >= data.path.length - 1

    let remainingPath = data.path.slice(lastReportNodeIndex);
    let distSinceLastReport = (curTime - data.lastReport.time)/1000 * data.speedFactor * this.LIGHT_SPEED_AU
    let remainingDistance = _.sum(
      _.map(_.zip(remainingPath.slice(0,-1), remainingPath.slice(1)),
        this.nodeDistance.bind(this))
    );

    return !wasDelivered && distSinceLastReport < remainingDistance;
  }

  updateMessagePosition(msg) {
    let {mesh, 'lastBackendData': data} = msg
    let curTime = new Date().getTime();

    let curNodeIndex = _.findIndex(data.path, {name: data.lastReport.name})

    let distSinceProbableLastNode = (curTime - data.lastReport.time)/1000 * data.speedFactor * this.LIGHT_SPEED_AU

    let distBetweenNodes = null
    let curNode, nextNode

    while (curNodeIndex < data.path.length-1) {
      curNode = data.path[curNodeIndex]
      nextNode = data.path[curNodeIndex+1]
      distBetweenNodes = this.distance(curNode.location, nextNode.location)

      if (distSinceProbableLastNode < distBetweenNodes) {
        // `curNode` is the last node which should have been visited already now
        break
      }
      else {
        distSinceProbableLastNode -= distBetweenNodes
        ++curNodeIndex
      }
    }

    let factorBetweenNodes = distSinceProbableLastNode / distBetweenNodes

    this.lerpPos(mesh.position, curNode.location, nextNode.location, factorBetweenNodes)
  }

  onMessageUpdated(evt) {
    let msg = _.find(this.state.msgs, {id: evt.message.id})
    let isNewMsg = !msg

    if (isNewMsg) {
      msg = evt.message

      this.state.msgs.push(this.createNewMessageObject(msg));
    }
    else {
      // TODO update msg!
    }
  }

  render() {
    this.updatePositions()

    if (this.state.isLeftMouseButtonDown) {
      this.camera.position.x -= (this.mouseX - this.camera.position.x) * 0.0001
      this.camera.position.y += (this.mouseY - this.camera.position.y) * 0.0001

      if (this.state.isArrowDownDown)
        this.camera.lookAt(this.scene.position)

      this.camera.updateProjectionMatrix()
    }

    this.renderer.render(this.scene, this.camera)
  }

  createNewMessageObject(msg) {
    let mesh = this.assets.getMessageMesh()
    mesh.name = msg.id

    let lines = []
    for (let nodeIndex = 0; nodeIndex < msg.path.length-1; ++nodeIndex) {
      let curNode = msg.path[nodeIndex]
      let nextNode = msg.path[nodeIndex+1]

      let line = this.prepareLineRender(msg.path[nodeIndex].location, msg.path[nodeIndex+1].location);
      lines.push(line)
    }

    return {
      id: msg.id,
      mesh,
      lines,
      lastBackendData: msg
    }
  }

  prepareLineRender(start, end) {
    let geometry = new THREE.Geometry()
    geometry.vertices.push(
      this.pointToVector3(start),
      this.pointToVector3(end)
    )
    geometry.colors = [new THREE.Color( 0x999999 ), new THREE.Color( 0x00ff11 )]
    let material = new THREE.LineBasicMaterial( { color: 0xffffff, opacity: 1, linewidth: 2, vertexColors: THREE.VertexColors, transparent: true } );
    let line = new THREE.Line(geometry, material)
    line.material.depthTest = false;
    line.renderOrder = 1.9;

    return line
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
