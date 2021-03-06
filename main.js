//"use strict"; 
var gl; 

//= objloader.js/lib/webgl-debug.js 
//= gl-matrix/gl-matrix-min.js 
//= objloader.js/lib/util/util.js
//= shapes.js  
//= aquarium/aquarium.js 

// MAIN 
var projection = mat4.perspective(75, 4/3, 0.1, 10); 
var isRunning = true; 

function main() {
    gl = UTIL.createContext(640, 480); 

   	var camPos = vec3.create([0,1,2]);
	var camNormal = vec3.create([0,0,-1]); 
	var camDir = vec3.create([0,0,0]); 
	var camUp = vec3.create([0,1,0]); 

    //var teapot = SHAPES.createTeapot(gl, projection); 
    var backplane = SHAPES.createLayer(gl, projection); 
    //var plane = SHAPES.createPlane(gl, projection); 

	UTIL.requestGameFrame(gameloop); 

    function gameloop(info) {
        if(isRunning) { 			
			var camera = calcCamera(info.time.delta, camPos, camNormal, camDir, camUp); 

			clear(gl); 
            backplane.draw(camera);
			//teapot.draw(camera); 
			//plane.draw(camera); 
            backplane.update(info.time.delta); 
			//teapot.update(info.time.delta); 
			//plane.update(info.time.delta); 
        }
		
		if(UTIL.keys.p.released) {
			isRunning = !isRunning; 
		}

        UTIL.requestGameFrame(gameloop); 
    }
}

function calcCamera(delta, camPos, camNormal, camDir, camUp) {
	var d = delta; 

	if(UTIL.keys.shift.down) {
		d *= 3; 
	}

	var camera = mat4.lookAt(camPos, vec3.add(camPos, camNormal, camDir), camUp);
	var pad = UTIL.gamepads.first;  

	var padX1 = pad.axes[0]; 
	var padY1 = pad.axes[1];
	var padX2 = pad.axes[2];
	var padY2 = pad.axes[3];

	var forward = padY1 * d; 
	var spin = padX2 * d * 2 * Math.PI; 

	forward += UTIL.keys.w.down ? d : 0; 
	forward -= UTIL.keys.s.down ? d : 0; 
	spin += UTIL.keys.a.down ? 2 * Math.PI * d : 0; 
	spin -= UTIL.keys.d.down ? 2 * Math.PI * d : 0; 

	vec3.add(camPos, [forward * camNormal[0], 0, forward * camNormal[2]]); 

	var matRot = mat4.identity(); 
	mat4.rotateY(matRot, spin); 
	mat4.rotateX(matRot, padY2); 
	mat4.multiplyVec3(matRot, camNormal); 

	return camera; 
}

function clear(gl) {
    gl.viewport(0, 0, 640, 480); 
    gl.clearColor(97 / 256, 149 / 256, 237 / 256, 1); 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 
	gl.enable(gl.DEPTH_TEST); 
}
