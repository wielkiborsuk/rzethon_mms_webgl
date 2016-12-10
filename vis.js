// import * as _ from 'lodash'

document.addEventListener('DOMContentLoaded', () => {
const
  DAY_MILLISECONDS = 24 * 60 * 60 * 1000,
  CAMERA_ZOOM_SPEED = 1000,
  CAMERA_MAX_ZOOM = 150,
  PLANET_RADIUS_SCALE = 0.0001,
  MESSAGE_RADIUS = 78*100

let container
let camera, scene, renderer
let group
let mouseX = 0, mouseY = 0

let windowHalfX = window.innerWidth / 2
let windowHalfY = window.innerHeight / 2

let viewState = {
  scale: 500
}

let state = {
  timeFactor: 1,
  d: 0,
  prevRenderTime: +new Date(),
  msgNodes: [
    /* id, mesh */
  ],
  msgs: [
    /*
     {
       mesh: {},
       lastBackendData: {
         "path": [
           {"name": "node1", "location": {"x": 1, "y": 1, "z": 1}},
           {"name": "node2", "location": {"x": 2, "y": 2, "z": 2}}
         ],
         "lastReport": {
           "name": "node1",
           "time": 12345677
         },
         "speedFactor": 1.23,
         "estimatedArrivalTime": 123456789
       }
     }
    */
  ]
}

  /**
   * route (lista node'ow - kazdy lokalizacja),
   * id ostatniego node'a, ktory potwierdzil odbior
   * czas kiedy to potwierdzil,
   * oczekiwany czas dotarcia,
   * predkosc przelotu
   */
  //
  // let msg = {
  //   "path": [
  //     {"name": "node1", "location": {"x": 1, "y": 1, "z": 1}},
  //     {"name": "node2", "location": {"x": 2, "y": 2, "z": 2}}
  //   ],
  //   "lastReport": {
  //     "name": "node1",
  //     "time": 12345677
  //   },
  //   "speedFactor": 1.23,
  //   "estimatedArrivalTime": 123456789
  // }


let $orbitals = {
      'mercury': {
        'n' : [48.3313, 3.24587E-5],
        'i' : [7.0047, 5.00E-8],
        'w' : [29.1241, 1.01444E-5],
        'a' : [0.387098, 0],
        'e' : [0.205635, 5.59E-10],
        'm' : [168.6562, 4.0923344368]
      },
      'venus' : {
        'n' : [76.6799, 2.46590E-5],
        'i' : [3.3946, 2.75E-8],
        'w' : [54.8910, 1.38374E-5],
        'a' : [0.723330, 0],
        'e' : [0.006773, 1.302E-9],
        'm' : [48.0052, 1.6021302244]
      },
      'earth' : {
        'n' : [0.0, 0],
        'i' : [0.0, 0],
        'w' : [282.9404, 4.70935e-5],
        'a' : [1.0, 0],
        'e' : [0.016709, 1.151e-9],
        'm' : [356.0470, 0.9856002585]
      },
      'mars' : {
        'n' : [49.5574, 2.11081e-5],
        'i' : [1.8497, 1.78e-8],
        'w' : [286.5016, 2.92961e-5],
        'a' : [1.523688, 0],
        'e' : [0.093405, 2.516e-9],
        'm' : [18.6021, 0.5240207766]
      },
      'jupiter' : {
        'n' : [100.4542, 2.76854E-5],
        'i' : [1.3030, 1.557E-7],
        'w' : [273.8777, 1.64505E-5],
        'a' : [5.20256, 0],
        'e' : [0.048498, 4.469E-9],
        'm' : [ 19.8950, 0.0830853001]
      },
      'saturn' : {
        'n' : [113.6634, 2.38980E-5],
        'i' : [2.4886, 1.081E-7],
        'w' : [339.3939, 2.97661E-5],
        'a' : [9.55475, 0],
        'e' : [0.055546, 9.499E-9],
        'm' : [316.9670, 0.0334442282]
      },
      'uranus' : {
        'n' : [74.0005, 1.3978E-5],
        'i' : [0.7733, 1.9E-8],
        'w' : [96.6612, 3.0565E-5],
        'a' : [19.18171, 1.55E-8],
        'e' : [0.047318, 7.45E-9],
        'm' : [142.5905, 0.011725806]
      },
      'neptune' : {
        'n' : [131.7806, 3.0173E-5],
        'i' : [1.7700, 2.55E-7],
        'w' : [272.8461, 6.027E-6],
        'a' : [30.05826, 3.313E-8],
        'e' : [0.008606, 2.15E-9],
        'm' : [260.2471, 0.005995147]
      }
  }

let textures = {}

// planets: id, textureUrl, diameter (km), scale
let $planets = [
  ['mercury', 'Mercury.jpg', 4900, 50],
  ['venus', 'Venus.jpg', 12100, 30],
  ['earth', 'land_ocean_ice_cloud_2048.jpg', 12800, 50],
  ['mars', 'Mars.jpg', 6800, 50],
  ['jupiter', 'Jupiter.jpg', 143000, 10],
  ['saturn', 'Saturn.jpg', 125000, 50],
  ['uranus', 'Uranus.jpg', 51100, 10],
  ['neptune', 'Neptune.jpg', 49500, 10]
]

let $otherBodies = [
  ['sun', 'Sun.jpg', 1391400/5]
]

preloadTextures().then(() => {
  init()
  animate()
})

function loadTexture(filename) {
  return new Promise((resolve, reject) => {
    let url = `assets/${filename}`
    let loader = new THREE.TextureLoader()
    loader.load(url, texture => {
      textures[filename] = texture
      resolve()
    })
  })
}

function preloadTextures() {
  let promises = []
  for (let body of $planets) {
    promises.push(loadTexture(body[1]))
  }
  promises.push(loadTexture('Sun.jpg'))
  promises.push(loadTexture('Message.jpg'))

  return Promise.all(promises)
}

function init() {
  container = document.getElementById('container')

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000)
  camera.position.z = 2000
  camera.far = 100000
  camera.near = 1
  camera.updateProjectionMatrix()

  scene = new THREE.Scene()
  group = new THREE.Group()
  scene.add(group)

  for (let body of $planets) {
    let node = initCelestialBody(body, true)
  }

  updatePositions()

  let earthPos = _.find(state.msgNodes, {id: 'earth'}).mesh.position
  let marsPos = _.find(state.msgNodes, {id: 'mars'}).mesh.position

  let lastBackendData = {
    path: [
      {name: "earth1", location: {x: earthPos.x, y: earthPos.y, z: earthPos.z}},
      {name: "mars1", location: {x: marsPos.x, y: marsPos.y, z: marsPos.z}}
    ],
    lastReport: {
      name: 'mars1',
      time: 1481397639
    },
    speedFactor: 10,
    estimatedArrivalTime: 1481397639+1000000
  }

  let texture = textures["Message.jpg"]
  let geometry = new THREE.SphereGeometry(MESSAGE_RADIUS, 20, 20)
  let material = new THREE.MeshBasicMaterial({ map: texture, overdraw: 1 })
  let mesh = new THREE.Mesh(geometry, material)

  state.msgs.push({
    mesh,
    lastBackendData
  })

  for (let body of $otherBodies) {
    initCelestialBody(body, false)
  }

  renderer = new THREE.CanvasRenderer()
  renderer.setClearColor(0)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight+1)
  container.appendChild(renderer.domElement)

  document.addEventListener('keydown', onKeyDown, false)
  document.addEventListener('mousemove', onDocumentMouseMove, false)
  document.addEventListener('mousewheel', onDocumentMouseWheel, false)
  window.addEventListener('resize', onWindowResize, false)
}

function initCelestialBody(params, isMsgNode = false) {
  const [id, textureFilename, diameter, scale] = params
  let texture = textures[textureFilename]
  let geometry = new THREE.SphereGeometry(PLANET_RADIUS_SCALE * diameter * scale, 20, 20)
  let material = new THREE.MeshBasicMaterial({ map: texture, overdraw: 1 })
  let mesh = new THREE.Mesh(geometry, material)

  group.add(mesh)

  let node = null

  if (isMsgNode) {
    node = {id, mesh}
    state.msgNodes.push(node)
  }

  return node
}

function render() {
  const curTime = +new Date()
  const prevTime = state.prevRenderTime
  const deltaTime = (curTime - prevTime)/1000
  state.d += (state.timeFactor * deltaTime)
  state.prevRenderTime = curTime

  // group.rotation.y -= 0.005

  updatePositions()


  camera.position.x += (mouseX - camera.position.x) * 0.05
  camera.position.y += (- mouseY - camera.position.y) * 0.05
  camera.lookAt(scene.position)
  camera.updateProjectionMatrix()

  renderer.render(scene, camera)
}

function onWindowResize() {
  windowHalfX = window.innerWidth / 2
  windowHalfY = window.innerHeight / 2

  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
}

function onKeyDown(evt) {
  if (evt.key == 'o') {
    state.timeFactor /= 2
  }
  else if (evt.key == 'p') {
    state.timeFactor *= 2
  }
  else if (evt.key == 's')
    viewState.enablePlanetScaling = !viewState.enablePlanetScaling
}

function onDocumentMouseMove(evt) {
  mouseX = (evt.clientX - windowHalfX)
  mouseY = (evt.clientY - windowHalfY)
}

function onDocumentMouseWheel(evt) {
  let z = camera.position.z + CAMERA_ZOOM_SPEED * Math.sign(evt.deltaY)

  if (z < CAMERA_MAX_ZOOM) {
    z = CAMERA_MAX_ZOOM
  }

  camera.position.z = z
  camera.updateProjectionMatrix()
}

function animate() {
  requestAnimationFrame(animate)
  render()
}

function updatePositions() {
  for (let node of state.msgNodes) {
    updateNodePosition(node)
  }

  for (let msg of state.msgs) {
    // TODO
  }
}

function updateNodePosition(node) {
  let {mesh, id} = node

  let orbs = getOrbitals(id, state.d)

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

  let scale = viewState.scale

  mesh.position.x = xh*scale
  mesh.position.y = yh*scale
  mesh.position.z = zh*scale
}

/** integer division */
function intDiv(a, b) {
  return Math.floor(a / b)
}

/**
 * @param u in milliseconds since 1 January 1970
 * @returns `d`
 */
function unixTimeToDayFraction(u) {
  let t = moment(u)
  let y = t.year(), m = t.month()+1, D = t.date()
  let d = 367 * y - intDiv(7 * ( y + intDiv(m+9,12) ), 4) + intDiv(275*m, 9) + D - 730530
  let dayMs = t.milliseconds() + 1000*(t.seconds() + 60*(t.minutes() + 60*(t.hours())))
  let dayFraction = dayMs / DAY_MILLISECONDS
  return d + dayFraction
}

console.log(unixTimeToDayFraction(1481382583000))


function getOrbitals(planet, d) {
  const o = $orbitals[planet]
  return {
    n: (o['n'][0] + o['n'][1] * d) * Math.PI / 180.0,
    i: (o['i'][0] + o['i'][1] * d) * Math.PI / 180.0,
    w: (o['w'][0] + o['w'][1] * d) * Math.PI / 180.0,
    a: o['a'][0] + o['a'][1] * d,
    e: (o['e'][0] + o['e'][1] * d) * Math.PI / 180.0,
    m: (o['m'][0] + o['m'][1] * d) * Math.PI / 180.0
  }
}

function genCoordinate(planet, max_day) {
  /*let points = (0..max_day).collect do |d|
    n,i,w,a,e,m = get_orbitals(planet,d)
    e2 = m + e * Math.sin(m) * (1.0 + e * Math.cos(m))

    xv = a * (Math.cos(e2) - e)
    yv = a * (Math.sqrt(1.0 - e*e) * Math.sin(e2))
    v = Math.atan2(yv, xv)
    r = Math.sqrt(xv*xv + yv*yv)

    xh = r * ( Math.cos(n) * Math.cos(v+w) - Math.sin(n) * Math.sin(v+w) * Math.cos(i))
    yh = r * ( Math.sin(n) * Math.cos(v+w) + Math.cos(n) * Math.sin(v+w) * Math.cos(i))
    zh = r * ( Math.sin(v+w) * Math.sin(i) )

    return [xh, yh, zh]
  }

  points.transpose*/
  }

})