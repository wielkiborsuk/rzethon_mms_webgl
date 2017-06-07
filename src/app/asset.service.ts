import { Injectable } from '@angular/core';
import * as THREE from 'three';

import { PlanetService } from './planet.service';

@Injectable()
export class AssetService {

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

    return Promise.all(promises)
  }
}
