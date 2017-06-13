import { Injectable } from '@angular/core';
import * as THREE from 'three';

import { PlanetService } from './planet.service';

@Injectable()
export class AssetService {
  private initOnce = false;
  private PLANET_RADIUS_SCALE = 0.0000004;
  private MESSAGE_RADIUS = 0.04;
  private NODE_RADIUS = 0.05;
  public textures = {};
  public fonts = {};

  constructor(private planets: PlanetService) { }

  loadTexture(filename) {
    return new Promise((resolve, reject) => {
      let url = `assets/${filename}`
      let loader = new THREE.TextureLoader()
      loader.load(url, texture => {
        this.textures[filename] = texture
        resolve()
      })
    })
  }

  loadFont(filename) {
    return new Promise((resolve, reject) => {
      let url = `assets/${filename}`
      let loader = new THREE.FontLoader()
      loader.load(url, font => {
        this.fonts[filename] = font
        resolve()
      })
    })
  }

  preloadAssets() {
    let promises = []
    if (!this.initOnce) {
      for (let body of this.planets.planets) {
        promises.push(this.loadTexture(body[2]))
      }
      promises.push(this.loadTexture('Sun.jpg'))
      promises.push(this.loadTexture('Message.jpg'))
      promises.push(this.loadTexture('Node.png'))

      // background
      promises.push(this.loadTexture('background/Space.jpg'))
      for (let i = 1; i <= 5; ++i)
        promises.push(this.loadTexture(`background/Layer${i}.png`))

      promises.push(this.loadFont('droid_sans_regular.typeface.json'))
      this.initOnce = true;
    }

    return Promise.all(promises)
  }

  getMessageMesh() {
    let texture = this.textures["Message.jpg"]
    let geometry = new THREE.SphereGeometry(this.MESSAGE_RADIUS, 40, 40)
    let material = new THREE.MeshBasicMaterial({ map: texture, transparent: true })
    let mesh = new THREE.Mesh(geometry, material)
    mesh.material.depthTest = false;
    mesh.renderOrder = 3;

    return mesh;
  }

  getBodyMesh(textureFilename: string, diameter: number, scale: number) {
    let texture = this.textures[textureFilename]
    let geometry = new THREE.SphereGeometry(this.PLANET_RADIUS_SCALE * diameter * scale, 20, 20)
    let material = new THREE.MeshBasicMaterial({ map: texture, transparent: true })
    let mesh = new THREE.Mesh(geometry, material)
    mesh.name = textureFilename;

    return mesh;
  }

  getNodeMesh() {
    let texture = this.textures["Node.png"]
    let geometry = new THREE.SphereGeometry(this.NODE_RADIUS, 40, 40)
    let material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.6 })
    let mesh = new THREE.Mesh(geometry, material)
    mesh.material.depthTest = false;
    mesh.renderOrder = 2;

    return mesh;
  }

  prepareLineRender(start, end) {
    let geometry = new THREE.Geometry()
    geometry.vertices.push(
      new THREE.Vector3(start.x, start.y, start.z),
      new THREE.Vector3(end.x, end.y, end.z)
    )
    geometry.colors = [new THREE.Color( 0x999999 ), new THREE.Color( 0x00ff11 )]
    let material = new THREE.LineBasicMaterial( { color: 0xffffff, opacity: 1, linewidth: 2, vertexColors: THREE.VertexColors, transparent: true } );
    let line = new THREE.Line(geometry, material)
    line.material.depthTest = false;
    line.renderOrder = 1.9;

    return line
  }
}
