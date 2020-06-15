
import Stats from 'Stats.js';
import Phong from '../shaders/phong/phong.js'
import DOF from '../shaders/dof/dof.js'
import ControlKit from 'controlkit';

import '../utils/utils'

import statue from '../../assets/models/statue.json'

import { mat4, vec3, vec2 } from '../utils/gl-matrix.js';


export default class StatueSceneDepth {

    constructor() {

        this.canvas          = document.getElementById( 'c' );
        this.canvas.width    = window.innerWidth;
        this.canvas.height   = window.innerHeight;
        this.gl              = this.canvas.getContext( 'webgl2' );
        this.resolution      = vec2.fromValues( this.gl.drawingBufferWidth, this.gl.drawingBufferHeight );

        if ( ! this.gl ) {

            console.error( "WebGL 2 not available" );

        }
        this.gl.viewport( 0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight );
        this.gl.clearColor( 0, 0, 0, 1 );
        this.gl.enable( this.gl.DEPTH_TEST );

        this.stats = new Stats();
        this.now;
        this.then;
        this.elapsed;

        this.fps = 144;
        this.fpsInterval = 1000 / this.fps;
        this.then = Date.now();
        this.startTime = this.then;

        this.phongProgram;
        this.dofProgram;

        this.statueArray;
        this.quadArray;

        this.dofUniformBuffer;

        this.sceneTexture;
        this.depthTexture;
        this.sceneFBO;

        this.sceneTextureLocation;
        this.depthTextureLocation;
        this.resolutionLocation;

        document.body.appendChild( this.stats.domElement );

        const obj = { tiling: 10.0, range: [ 1.0, 10.0 ] };

        this.cubeRotation = {

            angleX: 0,
            angleY: 0

        };

        this.rotateXMatrix  = mat4.create();
        this.rotateYMatrix  = mat4.create();
        this.modelMatrix    = mat4.create();

        this.modelMatrixLocation;
        this.numVertices;

        this.controlKit = new ControlKit();
            this.controlKit.addPanel()
                .addGroup()
                    .addSubGroup()
                        .addSlider( obj, 'tiling', 'range', {
                            onChange: ( index ) => {
                                
                                console.log( obj.tiling )

                            }
                        } );  
        
                
                    
        this._setup();

    }

    _setup() {       

        const gl = this.gl;

        // --------------------------- Setup statue program --------------------------- //

        const statueVsSource = Phong.vertexShader;
        const statueFsSource = Phong.fragmentShader;

        const vertexShader = gl.createShader( gl.VERTEX_SHADER );
        gl.shaderSource( vertexShader, statueVsSource );
        gl.compileShader( vertexShader );

        if ( ! gl.getShaderParameter( vertexShader, gl.COMPILE_STATUS ) ) {

            console.error( gl.getShaderInfoLog( vertexShader ) );

        }

        const fragmentShader = gl.createShader( gl.FRAGMENT_SHADER );
        gl.shaderSource( fragmentShader, statueFsSource );
        gl.compileShader( fragmentShader );

        if ( ! gl.getShaderParameter( fragmentShader, gl.COMPILE_STATUS ) ) {

            console.error( gl.getShaderInfoLog( fragmentShader ) );

        }

        this.phongProgram = gl.createProgram();
        gl.attachShader( this.phongProgram, vertexShader );
        gl.attachShader( this.phongProgram, fragmentShader );
        gl.linkProgram( this.phongProgram );

        if ( ! gl.getProgramParameter( this.phongProgram, gl.LINK_STATUS ) ) {

            console.error( gl.getProgramInfoLog( this.phongProgram ) );

        }
        
        // --------------------------- Setup DOF program --------------------------- //


        const dofVsSource       = DOF.vertexShader;
        const dofFsSource       = DOF.fragmentShader;

        const dofVertexShader       = gl.createShader( gl.VERTEX_SHADER );
        gl.shaderSource( dofVertexShader, dofVsSource );
        gl.compileShader( dofVertexShader );

        if ( ! gl.getShaderParameter( dofVertexShader, gl.COMPILE_STATUS ) ) {
            
            console.error( gl.getShaderInfoLog( dofVertexShader ) );

        }

        const dofFragmentShader = gl.createShader( gl.FRAGMENT_SHADER );
        gl.shaderSource( dofFragmentShader, dofFsSource );
        gl.compileShader( dofFragmentShader );

        if ( ! gl.getShaderParameter( dofFragmentShader, gl.COMPILE_STATUS ) ) {
            
            console.error( gl.getShaderInfoLog( dofFragmentShader ) );

        }

        this.dofProgram = gl.createProgram();
        gl.attachShader( this.dofProgram, dofVertexShader );
        gl.attachShader( this.dofProgram, dofFragmentShader );
        gl.linkProgram( this.dofProgram );

        if ( ! gl.getProgramParameter( this.dofProgram, gl.LINK_STATUS ) ) {

            console.error( gl.getProgramInfoLog( this.dofProgram ) );

        }


        // --------------------------- Get uniform locations --------------------------- //

        const sceneUniformsLocations = gl.getUniformBlockIndex( this.phongProgram, "SceneUniforms" );
        gl.uniformBlockBinding( this.phongProgram, sceneUniformsLocations, 0 );

        this.modelMatrixLocation    = gl.getUniformLocation( this.phongProgram, "uModel" );
        const texLocation           = gl.getUniformLocation( this.phongProgram, "tex" );


        
        this.sceneTextureLocation   = gl.getUniformLocation( this.dofProgram, "uSceneColor" );
        this.depthTextureLocation   = gl.getUniformLocation( this.dofProgram, "uDepthColor" );
        this.resolutionLocation     = gl.getUniformLocation( this.dofProgram, "uResolution" );      


        // --------------------------- Setup framebuffers ----------------------------- //

        gl.activeTexture(gl.TEXTURE0);
        this.sceneTexture  = gl.createTexture();
        gl.bindTexture( gl.TEXTURE_2D, this.sceneTexture );
        gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );

        this.sceneFBO = gl.createFramebuffer();
        gl.bindFramebuffer( gl.FRAMEBUFFER, this.sceneFBO );
        gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.sceneTexture, 0 );

        gl.activeTexture(gl.TEXTURE1);
        this.depthTexture = gl.createTexture();
        gl.bindTexture( gl.TEXTURE_2D, this.depthTexture );
        gl.texImage2D( gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );

        
        gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0 );


        // --------------------------- Setup Geometry --------------------------- //

        this.numVertices    = statue.verts.length / 3;

        // Statue

        this.statueArray     = gl.createVertexArray();
        gl.bindVertexArray( this.statueArray );
        
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( statue.verts ), gl.STATIC_DRAW );
        gl.vertexAttribPointer( 0, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( 0 );

        const uvBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, uvBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( statue.texcoords ), gl.STATIC_DRAW );
        gl.vertexAttribPointer( 1, 2, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( 1 );

        const normalBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( statue.normals ), gl.STATIC_DRAW );
        gl.vertexAttribPointer( 2, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( 2 );

        // Full Screen quad

        this.quadArray = gl.createVertexArray();
        gl.bindVertexArray( this.quadArray );

        const quadPositionBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, quadPositionBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( [

            -1, 1,
            -1, -1,
            1, -1,
            -1, 1,
            1, -1,
            1, 1

             
        ] ), gl.STATIC_DRAW );

        gl.vertexAttribPointer( 0, 2, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( 0 );

        // --------------------------- Set unfiorm data --------------------------- //

        const projMatrix     = mat4.create();
        mat4.perspective( projMatrix, Math.PI / 2, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 10. );

        const viewMatrix     = mat4.create();
        const eyePosition    = vec3.fromValues( 1, 0.5, 0 );

        mat4.lookAt( viewMatrix, eyePosition, vec3.fromValues( 0, 0.5, 0 ), vec3.fromValues( 0, 1, 0 ) );
        
        const viewProjMatrix = mat4.create();
        mat4.multiply( viewProjMatrix, projMatrix, viewMatrix );

        const lightPosition  = vec3.fromValues( 1, 1, 0.5 );               

        const sceneUniformData = new Float32Array( 24 );
        sceneUniformData.set( viewProjMatrix );
        sceneUniformData.set( eyePosition, 16 );
        sceneUniformData.set( lightPosition, 20 );

        const sceneUniformBuffer = gl.createBuffer();
        gl.bindBufferBase( gl.UNIFORM_BUFFER, 0, sceneUniformBuffer );
        gl.bufferData( gl.UNIFORM_BUFFER, sceneUniformData, gl.STATIC_DRAW );

        gl.useProgram( this.phongProgram );

        requestAnimationFrame( this.draw.bind( this ) );

    }

    draw( time ) {

        const gl        = this.gl;

        time *= 0.001;
    
        this.stats.begin();

        this.now = Date.now();
        this.elapsed = this.now - this.then;

        let aspect = 1;

        if ( this.elapsed > this.fpsInterval ) {

            this.then = this.now - ( this.elapsed % this.fpsInterval );

            // Draw scene

            {

                

                gl.bindFramebuffer( gl.FRAMEBUFFER, this.sceneFBO );

                gl.bindTexture( gl.TEXTURE_2D, this.sceneTexture );

                gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight );

                gl.clearColor( 0, 0, 1, 1 );
                gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

                gl.useProgram( this.phongProgram );

                gl.bindVertexArray( this.statueArray );      

                this.cubeRotation.angleY += 0.01;

                mat4.fromXRotation( this.rotateXMatrix, this.cubeRotation.angleX );
                mat4.fromYRotation( this.rotateYMatrix, this.cubeRotation.angleY );
                mat4.multiply( this.modelMatrix, this.rotateXMatrix, this.rotateYMatrix );

                gl.uniformMatrix4fv( this.modelMatrixLocation, false, this.modelMatrix );
                gl.drawArrays( gl.TRIANGLES, 0, this.numVertices );

                
            }

            {

                gl.bindFramebuffer(gl.FRAMEBUFFER, null);

                // Draw quad

                gl.enable(gl.DEPTH_TEST);
                gl.clear(gl.DEPTH_BUFFER_BIT);

                gl.useProgram( this.dofProgram );
                gl.uniform2f( this.resolutionLocation, gl.drawingBufferWidth, gl.drawingBufferHeight );

                gl.bindTexture( gl.TEXTURE_2D, this.sceneTexture );
                gl.uniform1i( this.sceneTextureLocation, 0 );      
                
                gl.bindTexture( gl.TEXTURE_2D, this.depthTexture );
                gl.uniform1i( this.depthTextureLocation, 1 );               
                

                gl.bindVertexArray( this.quadArray );               

                gl.drawArrays( gl.TRIANGLES, 0, 6 );

               

            }




        }

        this.stats.end();
        
        requestAnimationFrame( this.draw.bind( this ) );

    }

}