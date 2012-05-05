aquarium.WebGLRenderer = function(canvas_id, root) {
    aquarium.Renderer.call(this, root);
    this.canvas = document.getElementById(canvas_id);
	//gl = WebGLDebugUtils.makeDebugContext(this.canvas.getContext("experimental-webgl", {alpha : false, preserveDrawingBuffer : true}).getSafeContext()); 
	gl = this.canvas.getContext("experimental-webgl", {alpha : false, preserveDrawingBuffer : true}); 


   	var camPos = vec3.create([0,0,0.5]);
	var camNormal = vec3.create([0,0,-1]); 
	var camDir = vec3.create([0,0,0]); 
	var camUp = vec3.create([0,1,0]); 
	var camera = mat4.lookAt(camPos, vec3.add(camPos, camNormal, camDir), camUp);
	var projection = mat4.perspective(75, 4/3, 0.1, 10); 
	var canvasWidth = 1024; 
	var canvasHeight = 600; 

	var renderEntity = getRenderFunc(projection); 

    this.render = function() {
		console.log("renderer"); 
		clear(gl); 	
		this.world.render(); 

        for(var i = 0, e; e = this.world.entities[i]; i++) {
			// {pos, size, direction, speed, Age, sex }
			// {texture, center, width, height}
            var texture = this.resource.entries.textures[e.resource_id];
			renderEntity(camera, texture, e.pos, e.size /*, resource.center, resource.width, resource.height*/); 
        }

        return 2;
    }

    this.add_frame_callback(this.render.bind(this));

	this.setup = function() {
		console.log("setup"); 
		for(var resourceId in this.resource.entries.textures) {
            var image = this.resource.entries.textures[resourceId];
			// {texture, center}
			var glTexture = gl.createTexture(); 

			gl.bindTexture(gl.TEXTURE_2D, glTexture);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.bindTexture(gl.TEXTURE_2D, null);

			this.resource.entries.textures[resourceId] =  glTexture; 
        }
	
		this.frame(); 
	}; 

	function getRenderFunc(projection) {
		var vPositionIndx = 0; 
		var vColorIndx = 1; 
		var vTransIndx = 2; 

		var vShaderSrc = UTIL.getSource("shader.vs"); 
		var fShaderSrc = UTIL.getSource("shader.fs"); 

		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, vShaderSrc);
		gl.compileShader(vertexShader);

		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, fShaderSrc);
		gl.compileShader(fragmentShader);

		var program = gl.createProgram();

		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);	

		var plane = UTIL.shapes.createPlane(0); 
		var vertices = plane.vertices; 
		var texCoords = plane.texCoords; 
		program.numVertices = vertices.length / 4; 

		//Vertices
		var posbuffer = gl.createBuffer(); 
		gl.bindBuffer(gl.ARRAY_BUFFER, posbuffer); 
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW); 
		gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0); 
		gl.enableVertexAttribArray(0); 		

		//texture koordinaten 
		var texbuffer = gl.createBuffer(); 
		gl.bindBuffer(gl.ARRAY_BUFFER, texbuffer); 
		gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW); 	
		gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0); 
		gl.enableVertexAttribArray(1); 		

		gl.useProgram(program); 
		//gl.enableVertexAttribArray(0); 
		//gl.enableVertexAttribArray(1); 		
		var fTexIndx = gl.getUniformLocation(program, "texture"); 
		var vProjectionIndx = gl.getUniformLocation(program, "vProjection");
		gl.uniformMatrix4fv(vProjectionIndx, false, projection);

		return function(camera, texture, position, size) {
			// {pos, size, direction, speed, Age, sex }
			// {texture, center, width, height}
			console.log(position.x + " " + position.y); 
			var modelview = mat4.identity(); 
			mat4.translate(modelview, [0.5 + position.x / canvasWidth, 0.5 + position.y / canvasHeight, -4]); 
			//mat4.rotateX(modelview, 1 / 1000 * Date.now() * Math.PI / 2); 
			mat4.scale(modelview, [1,1,1]); 

			gl.useProgram(program); 
			gl.enableVertexAttribArray(0); 
			gl.enableVertexAttribArray(1); 		

			var vModelViewIndx = gl.getUniformLocation(program, "vModelView");
			gl.uniformMatrix4fv(vModelViewIndx, false, modelview);


			console.log("tex"); 
			gl.activeTexture(gl.TEXTURE0); 
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.uniform1i(fTexIndx, 0); 
			gl.bindBuffer(gl.ARRAY_BUFFER, posbuffer); 
			gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0); 
			gl.enableVertexAttribArray(0); 
			gl.drawArrays(gl.TRIANGLES, 0, program.numVertices); 

			gl.bindTexture(gl.TEXTURE_2D, null);//*/
		};
	}

	function clear(gl) {
    	gl.viewport(0, 0, canvasWidth, canvasHeight); 
	    gl.clearColor(97 / 256, 149 / 256, 237 / 256, 1); 
	    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 
		gl.enable(gl.DEPTH_TEST); 
	}
}


