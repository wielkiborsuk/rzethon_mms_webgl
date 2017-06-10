import { Injectable } from '@angular/core';
import * as THREE from 'three';
import * as moment from 'moment/moment';
import * as _ from 'lodash';

import { PlanetService } from './planet.service';
import { AssetService } from './asset.service';
import { StateService } from './state.service';

@Injectable()
export class RenderService {

  private PLANET_RADIUS_SCALE = 0.0000004;
  private DAY_MILLISECONDS = 24 * 60 * 60 * 1000;
  private DIFF_2000_1970 = moment('2000-01-01').diff('1970-01-01', 'ms') - 3600000 - 86400000
  private ASTRONOMICAL_UNIT = 149597870.7; //km
  private MESSAGE_RADIUS = 0.04;
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
    this.container = document.getElementById('container')

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 2000)
    this.camera.position.z = 1.5
    this.camera.far = 100000
    this.camera.near = 0.000001
    this.camera.updateProjectionMatrix()

    this.scene = new THREE.Scene()

    this.initBackground()

    for (let body of this.planets.planets) {
      let node = this.initCelestialBody(body, true)
    }

    this.updatePositions()

    for (let body of this.planets.otherBodies) {
      this.initCelestialBody(body, false)
    }

    this.renderer = new THREE.WebGLRenderer({antialias: true, logarithmicDepthBuffer: true})
    this.renderer.setClearColor(0)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
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

  initCelestialBody(params, isMsgNode = false) {
    const [id, name, textureFilename, diameter, scale, orbDays] = params
    let texture = this.assets.textures[textureFilename]
    let geometry = new THREE.SphereGeometry(this.PLANET_RADIUS_SCALE * diameter * scale, 20, 20)
    let material = new THREE.MeshBasicMaterial({ map: texture, overdraw: 1 })
    let mesh = new THREE.Mesh(geometry, material)

    let node = null

    if (isMsgNode) {
      // orb
      const D = 1
      geometry = new THREE.Geometry()
      material = new THREE.LineBasicMaterial({ color: 0xFFFFFF })
      for (let d = 0, i = 0; d < orbDays; d += D, i += 3) {
        let pos = {x: 0, y: 0, z: 0}
        this.calcNodePosition(pos, id, d)
        geometry.vertices.push(new THREE.Vector3(pos.x, pos.y, pos.z))
      }
      this.scene.add(new THREE.Line(geometry, material))

      // save node
      node = {id, mesh}
      this.state.planetNodes.push(node)
    }

    this.scene.add(mesh)

    return node
  }

  initNode(id, loc) {
    let texture = this.assets.textures["Node.png"]
    let geometry = new THREE.SphereGeometry(this.NODE_RADIUS, 40, 40)
    let material = new THREE.MeshBasicMaterial({ map: texture, overdraw: 1 })
    let mesh = new THREE.Mesh(geometry, material)

    mesh.position.x = loc.x
    mesh.position.y = loc.y
    mesh.position.z = loc.z
    this.scene.add(mesh)

    this.state.msgNodes.push({ id: id, mesh })
  }

  updatePositions() {
    for (let node of this.state.planetNodes) {
      this.updateNodePosition(node)
    }

    let indicesToRemove = []
    for (let i = 0, n = this.state.msgs.length; i < n; ++i) {
      let msg = this.state.msgs[i]
      if (this.updateMessagePosition(msg))
        indicesToRemove.push(i)
    }
    for (let i = indicesToRemove.length-1; i >= 0; --i) {
      let msg = this.state.msgs[i]
      this.scene.remove(msg.mesh)
      for (let line of msg.lines)
        this.scene.remove(line)

      this.state.msgs.splice(i, 1)
    }
  }

  updateNodePosition(node) {
    let {mesh, id} = node
    this.calcNodePosition(mesh.position, id, this.state.d)

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

  /**
   * @returns `true` if message has been delivered
   * @param msg
   */
  updateMessagePosition(msg) {
    let {mesh, lastBackendData} = msg
    const data = lastBackendData
    let curTime = this.dayFractionToUnixTime(this.state.d)

    let lastReportNodeIndex = _.findIndex(data.path, {name: data.lastReport.name})
    let wasDelivered = lastReportNodeIndex >= data.path.length - 1

    let curNode, nextNode

    if (wasDelivered) {
      return true
    }

    let lastReportTime = data.lastReport.time
    let curNodeIndex = lastReportNodeIndex

    let distSinceLastReport = (curTime - lastReportTime)/1000 * lastBackendData.speedFactor * this.LIGHT_SPEED_AU
    let distSinceProbableLastNode = distSinceLastReport
    let distBetweenNodes = null

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

    if (distBetweenNodes === 0) {
      return true
    }

    let factorBetweenNodes = distSinceProbableLastNode / distBetweenNodes

    if (factorBetweenNodes >= 1 || curNodeIndex === data.path.length-1) {
      return true
    }

    this.lerpPos(mesh.position, curNode.location, nextNode.location, factorBetweenNodes)

    return false
  }

  onMessageUpdated(evt) {
    let msg = _.find(this.state.msgs, {id: evt.message.id})
    let isNewMsg = !msg

    if (isNewMsg) {
      msg = evt.message

      let texture = this.assets.textures["Message.jpg"]
      let geometry = new THREE.SphereGeometry(this.MESSAGE_RADIUS, 40, 40)
      let material = new THREE.MeshBasicMaterial({ map: texture, overdraw: 1 })
      let mesh = new THREE.Mesh(geometry, material)

      this.scene.add(mesh)

      // now render lines!!111111 elo 3 2 0
      let lines = []
      for (let nodeIndex = 0; nodeIndex < msg.path.length-1; ++nodeIndex) {
        let curNode = msg.path[nodeIndex]
        let nextNode = msg.path[nodeIndex+1]

        geometry = new THREE.Geometry()
        geometry.vertices.push(
          this.pointToVector3(curNode.location),
          this.pointToVector3(nextNode.location)
        )
        geometry.colors = [new THREE.Color( 0x999999 ), new THREE.Color( 0x00ff11 )]
        material = new THREE.LineBasicMaterial( { color: 0xffffff, opacity: 1, linewidth: 2, vertexColors: THREE.VertexColors } );
        let line = new THREE.Line(geometry, material)
        this.scene.add(line)
        lines.push(line)
      }

      this.state.msgs.push({
        id: msg.id,
        mesh,
        lines,
        lastBackendData: msg
      })
    }
    else {
      // TODO update msg!
    }
  }

  render() {
    const curTime = new Date().getTime()
    const prevTime = this.state.prevRenderTime
    let deltaTime = (curTime - prevTime)/1000/60/60/24

    if (curTime - prevTime > 500) {
      deltaTime = 0.015/60/60/24 //15 ms
    }

    this.state.d += (this.state.timeFactor * deltaTime)
    this.state.prevRenderTime = curTime

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

  dayFractionToUnixTime(d) {
    return Math.floor(d * this.DAY_MILLISECONDS + this.DIFF_2000_1970)
  }

  lerpPos(outPos, pos1, pos2, factor) {
    outPos.x = +pos1.x + (+pos2.x - pos1.x) * factor
    outPos.y = +pos1.y + (+pos2.y - pos1.y) * factor
    outPos.z = +pos1.z + (+pos2.z - pos1.z) * factor
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