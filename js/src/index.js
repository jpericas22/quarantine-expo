import * as THREE from './lib/three.module.js';
import {OrbitControls} from './lib/OrbitControls.js';
import shineShaderVert from './gles/shine.vert'
import shineShaderFrag from './gles/shine.frag'
import * as CONFIG from './config.json';

let touchDevice = (navigator.maxTouchPoints || 'ontouchstart' in document.documentElement);
const initFov = touchDevice ? 100.00 : 70.00;
let fov = initFov;
let fovMin = 12.00, fovMax = 150.00, fovMultiplier = 0.02;
let loaded = false;
let popupVisible = false;
const loadTime = 2.0;
const clickCancelRange = touchDevice ? 40 : 10;
let mainSceneIndex = Math.floor(Math.random() * 3);

/*
let cameraPosition = new THREE.Vector3(0, 0, 100);

window.setRotation = (i, x, y, z) => {
	let object = CONFIG.SCENE[mainSceneIndex].OBJECT[i];
	object.pointer.lookAt(cameraPosition);
	object.rotation = [x, y, z];
	x = (x / 360.0) * 2 * Math.PI;
	y = (y / 360.0) * 2 * Math.PI;
	z = (z / 360.0) * 2 * Math.PI;
	object.pointer.rotateX(x);
	object.pointer.rotateY(y);
	object.pointer.rotateZ(z);
};

window.getRotation = i => {
	let object = CONFIG.SCENE[mainSceneIndex].OBJECT[i];
	console.log(object.rotation);
};
*/

const easeOut = t => {
	return (--t) * t * t + 1;
};

const preLoad = () => {
	let manager = new THREE.LoadingManager();
	let loader = new THREE.TextureLoader(manager);
	CONFIG.SCENE.forEach(scene => {
		loader.load(scene.PANORAMA, texture => {
			texture.magFilter = THREE.NearestFilter;
			texture.minFilter = THREE.NearestFilter;
			scene.PANORAMA = texture;
		});
		scene.OBJECT.forEach((object, i) => {
			loader.load(object.icon, texture => {
				texture.magFilter = THREE.NearestFilter;
				texture.minFilter = THREE.NearestFilter;
				scene.OBJECT[i].icon = texture;
			});
		});
	});
	return manager;
};

const delay = async t => {
	return new Promise(resolve => {
		setTimeout(resolve, t);
	})
};

const updateShader = (objects, time) => {
	if (loaded) {
		objects.forEach(object => {
			let uniforms = object.material.uniforms;
			uniforms.time = {
				value: time,
				needsUpdate: true
			};
		})
	}
};

const getInstagramPost = url => {
	let options = {
		method: 'GET',
		mode: 'cors',
		cache: 'default'
	};
	url = 'https://api.instagram.com/oembed/?url=' + url + '&omitscript=true';
	let request = new Request(url, options);
	return fetch(request).then(response => response.json());
};

/*
const touchZoom = event => {
	console.log('touch');
	if (loaded && !popupVisible) {
		let dx = event.touches[0].pageX - event.touches[1].pageX;
		let dy = event.touches[0].pageY - event.touches[1].pageY;
		let distance = Math.sqrt(dx * dx + dy * dy);
		let value = fov + distance * fovMultiplier;
		if (value < fovMax && value > fovMin) {
			fov = value;
			camera.fov = fov;
			camera.updateProjectionMatrix();
		}
	}
};
*/

const setupSceneObjects = (sceneIndex, camera, objectScene) => {
	CONFIG.SCENE[sceneIndex].OBJECT.forEach(object => {
		let texture = object.icon;
		let geometry = new THREE.PlaneGeometry(texture.image.width * object.sizeMultiplier, texture.image.height * object.sizeMultiplier, 1, 1);
		let material = new THREE.ShaderMaterial({
			uniforms: {
				...CONFIG.SHADER,
				time: {value: 0.0},
				texture_main: {value: texture},
			},
			vertexShader: shineShaderVert,
			fragmentShader: shineShaderFrag,
			transparent: true,
			side: THREE.DoubleSide,
		});
		let mesh = new THREE.Mesh(geometry, material);
		let position = new THREE.Vector3(...object.position);
		mesh.position.copy(position);
		mesh.instagram = object.instagram;
		mesh.randomOffset = Math.random() * 2.0 * Math.PI;
		mesh.lookAt(camera.position);
		mesh.rotateX((object.rotation[0] / 360.0) * 2 * Math.PI);
		mesh.rotateY((object.rotation[1] / 360.0) * 2 * Math.PI);
		mesh.rotateZ((object.rotation[2] / 360.0) * 2 * Math.PI);
		objectScene.add(mesh);
		object.pointer = mesh;
	});
};

const init = async () => {
	let revealerHTML = document.getElementById('popup-toggle');
	let popupHTML = document.getElementById('popup');
	let instagramHTML = document.getElementById('instagram');
	let infoHTML = document.getElementById('info');
	
	window.__igEmbedLoaded = async () => {
		//console.log('loaded');
		let iframe = instagramHTML.querySelector('iframe');
		iframe.style.margin = '0';
		instagramHTML.classList.remove('animate');
		await delay(600);
		instagramHTML.style.opacity = '';
		instagramHTML.classList.add('animate');
	};
	
	let clock = new THREE.Clock(false);
	let mouse = new THREE.Vector2();
	let mouseOriginal = new THREE.Vector2();
	let enableClick = false;
	
	let camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 1, 2000);
	camera.position.set(0, 0, 100);
	
	let panoramaScene = new THREE.Scene();
	
	CONFIG.SCENE.forEach((scene, i) => {
		let panoramaGeometry = new THREE.SphereGeometry(500, 60, 40);
		let panoramaMaterial = new THREE.MeshBasicMaterial({
			map: scene.PANORAMA,
			side: THREE.DoubleSide,
			opacity: mainSceneIndex === i ? 1.0 : 0.0,
			transparent: true
		});
		panoramaGeometry.scale(-1, 1, 1);
		let mesh = new THREE.Mesh(panoramaGeometry, panoramaMaterial);
		mesh.position.set(0, 0, 0);
		scene.PANORAMA_REFERENCE = mesh;
		panoramaScene.add(mesh);
	});
	
	let renderer = new THREE.WebGLRenderer({
		alpha: true,
		antialias: true,
	});
	renderer.autoClear = false;
	//renderer.setClearColor(new THREE.Color(0xffffff), 0);
	
	renderer.setSize(window.innerWidth, window.innerHeight);
	let controls = new OrbitControls(camera, renderer.domElement);
	controls.enablePan = false;
	controls.enableZoom = false;
	controls.enableDamping = true;
	controls.dampingFactor = 0.1;
	controls.rotateSpeed = touchDevice ? -0.4 : -0.2;
	controls.rotate(Math.random() * 2.0 * Math.PI);
	controls.update();
	
	const handleClick = objects => {
		if (loaded) {
			let url = objects[0].object.instagram;
			controls.enableRotate = false;
			controls.update();
			instagramHTML.style.opacity = '0';
			instagramHTML.style.display = 'block';
			infoHTML.style.display = 'none';
			popupHTML.style.display = 'flex';
			popupVisible = true;
			getInstagramPost(url)
				.then(response => {
					document.getElementById('instagram').innerHTML = response.html;
					instgrm.Embeds.process();
				})
		}
	};
	
	let objectScene = new THREE.Scene();
	setupSceneObjects(mainSceneIndex, camera, objectScene);
	
	document.getElementById('panorama').appendChild(renderer.domElement);
	let rayCaster = new THREE.Raycaster();
	
	window.addEventListener('resize', () => {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	}, false);
	
	let initDragPos = [0, 0];
	
	window.addEventListener('mousedown', e => {
		if (e.target.tagName.toLowerCase() !== 'canvas') {
			return;
		}
		initDragPos = [e.clientX, e.clientY];
	});
	
	window.addEventListener('mouseup', e => {
		if (e.target.tagName.toLowerCase() !== 'canvas') {
			return;
		}
		let finalDragPos = [e.clientX, e.clientY];
		let diffDragPos = [Math.abs(initDragPos[0] - finalDragPos[0]), Math.abs(initDragPos[1] - finalDragPos[1])];
		if (diffDragPos[0] > clickCancelRange || diffDragPos[1] > clickCancelRange) {
			return;
		}
		mouseOriginal.x = e.clientX;
		mouseOriginal.y = window.innerHeight - e.clientY;
		mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
		mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
		enableClick = true;
	});
	
	window.addEventListener('touchstart', e => {
		console.log(e);
		if (e.target.tagName.toLowerCase() !== 'canvas') {
			return;
		}
		initDragPos = [e.changedTouches[0].clientX, e.changedTouches[0].clientY];
		console.log(initDragPos);
	});
	
	window.addEventListener('touchend', e => {
		if (e.target.tagName.toLowerCase() !== 'canvas') {
			return;
		}
		let finalDragPos = [e.changedTouches[0].clientX, e.changedTouches[0].clientY];
		let diffDragPos = [Math.abs(initDragPos[0] - finalDragPos[0]), Math.abs(initDragPos[1] - finalDragPos[1])];
		console.log(finalDragPos);
		console.log(diffDragPos);
		if (diffDragPos[0] > clickCancelRange || diffDragPos[1] > clickCancelRange) {
			return;
		}
		mouseOriginal.x = e.changedTouches[0].clientX;
		mouseOriginal.y = window.innerHeight - e.changedTouches[0].clientY;
		mouse.x = (e.changedTouches[0].clientX / window.innerWidth) * 2 - 1;
		mouse.y = -(e.changedTouches[0].clientY / window.innerHeight) * 2 + 1;
		enableClick = true;
	});
	
	window.addEventListener('wheel', e => {
		if (loaded && !popupVisible) {
			let value = fov + e.deltaY * fovMultiplier;
			if (value < fovMax && value > fovMin) {
				fov = value;
				camera.fov = fov;
				camera.updateProjectionMatrix();
			}
		}
	});
	
	document.getElementById('popup').addEventListener('click', (e) => {
		let classList = e.target.classList;
		if (classList.contains('popup') || classList.contains('popup-control-img')) {
			instagramHTML.style.display = 'none';
			instagramHTML.style.opacity = '0';
			instagramHTML.classList.remove('animate');
			infoHTML.style.display = 'none';
			popupHTML.style.display = 'none';
			controls.enableRotate = true;
			controls.update();
			popupVisible = false;
		}
	});
	
	revealerHTML.addEventListener('click', () => {
		instagramHTML.style.display = 'none';
		infoHTML.classList.remove('animate');
		infoHTML.classList.add('animate');
		infoHTML.style.display = 'block';
		popupHTML.style.display = 'flex';
	});
	
	let introFunctionReference = () => {
	};
	
	let introFunction = sceneIndex => {
		let time = clock.getElapsedTime();
		if (time > loadTime) {
			loaded = true;
			panoramaScene.children[sceneIndex].material.opacity = 1;
			objectScene.children.forEach(object => {
				object.material.uniforms.brightnessOffset = {
					value: 0.0,
					needsUpdate: true
				};
				object.material.uniforms.opacityMultiplier = {
					value: 1.0,
					needsUpdate: true
				}
			});
			introFunctionReference = () => {
			};
		} else {
			let rangeVal = easeOut(time / loadTime);
			panoramaScene.children[sceneIndex].material.opacity = rangeVal;
			objectScene.children.forEach(object => {
				object.material.uniforms.brightnessOffset = {
					value: (1.0 - rangeVal),
					needsUpdate: true
				};
				object.material.uniforms.opacityMultiplier = {
					value: rangeVal,
					needsUpdate: true
				}
			});
			let fovRange = fovMax - fov;
			camera.fov = fovMax - rangeVal * fovRange;
			camera.updateProjectionMatrix();
		}
	};
	introFunctionReference = introFunction;
	
	const changeScene = () => {
		let loadingHTML = document.querySelector('.loading');
		loadingHTML.style.display = 'none';
		panoramaScene.children.forEach((panorama, i) => {
			panorama.material.opacity = mainSceneIndex === i ? 1.0 : 0.0;
		});
		objectScene.children = [];
		setupSceneObjects(mainSceneIndex, camera, objectScene);
		fov = initFov;
		introFunctionReference = introFunction;
		clock = new THREE.Clock(true);
	};
	
	const clickRender = () => {
		let time = clock.getElapsedTime();
		updateShader(objectScene.children, time);
		controls.update();
		//renderer.setClearColor(new THREE.Color(0x000000), 0);
		let renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
		renderer.setRenderTarget(renderTarget);
		renderer.clear();
		renderer.render(objectScene, camera);
		let read = new Uint8Array(4);
		renderer.readRenderTargetPixels(renderTarget, mouseOriginal.x, mouseOriginal.y, 1, 1, read);
		//renderer.setClearColor(0xffffff, 0);
		renderer.setRenderTarget(null);
		return read[3] >= 250;
	};
	
	const animate = () => {
		let time = clock.getElapsedTime();
		introFunctionReference(mainSceneIndex);
		updateShader(objectScene.children, time);
		requestAnimationFrame(animate);
		controls.update();
		renderer.clear();
		renderer.render(panoramaScene, camera);
		renderer.clearDepth();
		renderer.render(objectScene, camera);
		if (enableClick) {
			rayCaster.setFromCamera(mouse, camera);
			let clickedObjects = rayCaster.intersectObjects(objectScene.children);
			//let clickPosition = rayCaster.intersectObjects(panoramaScene.children)[0].point;
			//console.log('click at: [' + clickPosition.x + ', ' + clickPosition.y + ', ' + clickPosition.z + ']');
			if (clickedObjects.length > 0 && clickRender()) {
				handleClick(clickedObjects);
			}
			enableClick = false;
		}
	};
	setTimeout(() => {
		let navButtons = document.querySelectorAll('.navbutton img');
		navButtons.forEach((button, i) => {
			if (i === mainSceneIndex) {
				button.src = CONFIG.NAV[i].act;
			}
			button.addEventListener('click', e => {
				navButtons.forEach((button, i) => {
					button.src = CONFIG.NAV[i].deact;
				});
				// noinspection JSUnresolvedFunction
				let sceneIndex = parseInt(e.target.getAttribute('data-scene'));
				e.target.src = CONFIG.NAV[sceneIndex].act;
				mainSceneIndex = sceneIndex;
				changeScene();
			});
		});
		animate();
		clock.start();
	}, 800);
	
};

window.onload = async () => {
	let preLoadManager = preLoad();
	preLoadManager.onProgress = (item, loaded, total) => {
		let progress = Math.round((loaded / total) * 100);
		let loadingBar = document.querySelector('.loading-container');
		loadingBar.style.width = progress + '%';
	};
	preLoadManager.onLoad = () => {
		init();
	};
};
