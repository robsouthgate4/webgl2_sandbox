
import Stats from 'Stats.js';
import Geo from '../shaders/geo/geo.js'
import DEFERRED from '../shaders/deferred/deferred.js'
import BOXBLUR  from '../shaders/blur/boxBlur.js'
import DOF      from '../shaders/dof/dof.js'
import ControlKit from 'controlkit';

import '../utils/utils'

import character from '../../assets/models/ironman.json'

import { mat4, vec3, vec2 } from '../utils/gl-matrix.js';


export default class StatueSceneDOF {

    constructor() {

        this.canvas          = document.getElementById( 'c' );
        this.canvas.width    = window.innerWidth;
        this.canvas.height   = window.innerHeight;
        this.gl              = this.canvas.getContext( 'webgl2' );
        const gl             = this.gl;
        this.resolution      = vec2.fromValues( this.gl.drawingBufferWidth, this.gl.drawingBufferHeight );

        if ( ! gl ) {

            console.error( "WebGL 2 not available" );


        }

        gl.viewport( 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight );
        gl.clearColor( 0, 0, 0, 1 );

        if ( !gl.getExtension("EXT_color_buffer_float" ) ) {

            console.error( "FLOAT color buffer not available" );

        }

        this.stats = new Stats();
        this.now;
        this.then;
        this.elapsed;

        this.fps = 144;
        this.fpsInterval = 1000 / this.fps;
        this.then = Date.now();
        this.startTime = this.then;

        this.geoProgram;
        this.deferredProgram;
        this.boxBlurProgram;

        this.statueArray;
        this.quadArray;

        this.numOfStatueElements;

        this.dofUniformBuffer;

        // FBOs

        this.sceneTexture;
        this.depthTexture;
        this.blurTexture;
        this.diffuseTexture;
        this.sceneFBO;
        this.gBuffer;
        this.positionTexture;
        this.normalTexture;
        this.uvTexture;

        this.sceneTextureLocation;
        this.depthTextureLocation;
        this.blurTextureLocation;
        this.positionTextureLocation;
        this.normalTextureLocation;
        this.uvTextureLocation;
        this.resolutionLocation;
        this.dofPositionTextureLocation;

        document.body.appendChild( this.stats.domElement );

        const obj = { amount: 0 };

        this.rotation = {

            angleX: 0,
            angleY: 0

        };

        this.rotateXMatrix  = mat4.create();
        this.rotateYMatrix  = mat4.create();
        this.modelMatrix    = mat4.create();

        this.modelMatrixLocation;
        this.numVertices;
        this.indicesBuffer;

        this.controlKit = new ControlKit();
            this.controlKit.addPanel()
                .addGroup()
                    .addSubGroup()
                        // .addSlider( obj, 'amount', {
                        //     onChange: ( index ) => {
                                
                        //         console.log( obj.amount )

                        //     }
                        // } );  
        
                
                    
        this._setup();

    }

    _setup() {       

        const gl = this.gl;

        // --------------------------- Setup statue program --------------------------- //

        const statueVsSource = Geo.vertexShader;
        const statueFsSource = Geo.fragmentShader;

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

        this.geoProgram = gl.createProgram();
        gl.attachShader( this.geoProgram, vertexShader );
        gl.attachShader( this.geoProgram, fragmentShader );
        gl.linkProgram( this.geoProgram );

        if ( ! gl.getProgramParameter( this.geoProgram, gl.LINK_STATUS ) ) {

            console.error( gl.getProgramInfoLog( this.geoProgram ) );

        }

        // --------------------------- Setup blur program --------------------------------- //

        const boxBlurVsSource       = BOXBLUR.vertexShader;
        const boxBlurFsSource       = BOXBLUR.fragmentShader;

        const boxBlurVertexShader       = gl.createShader( gl.VERTEX_SHADER );
        gl.shaderSource( boxBlurVertexShader, boxBlurVsSource );
        gl.compileShader( boxBlurVertexShader );

        if ( ! gl.getShaderParameter( boxBlurVertexShader, gl.COMPILE_STATUS ) ) {
            
            console.error( gl.getShaderInfoLog( boxBlurVertexShader ) );

        }

        const boxBlurFragmentShader = gl.createShader( gl.FRAGMENT_SHADER );
        gl.shaderSource( boxBlurFragmentShader, boxBlurFsSource );
        gl.compileShader( boxBlurFragmentShader );

        if ( ! gl.getShaderParameter( boxBlurFragmentShader, gl.COMPILE_STATUS ) ) {
            
            console.error( gl.getShaderInfoLog( boxBlurFragmentShader ) );

        }

        this.boxBlurProgram = gl.createProgram();
        gl.attachShader( this.boxBlurProgram, boxBlurVertexShader );
        gl.attachShader( this.boxBlurProgram, boxBlurFragmentShader );
        gl.linkProgram( this.boxBlurProgram );

        if ( ! gl.getProgramParameter( this.boxBlurProgram, gl.LINK_STATUS ) ) {

            console.error( gl.getProgramInfoLog( this.boxBlurProgram ) );

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

        // --------------------------- Setup Deferred program --------------------------- //


        const deferredVsSource       = DEFERRED.vertexShader;
        const deferredFsSource       = DEFERRED.fragmentShader;

        const deferredVertexShader       = gl.createShader( gl.VERTEX_SHADER );
        gl.shaderSource( deferredVertexShader, deferredVsSource );
        gl.compileShader( deferredVertexShader );

        if ( ! gl.getShaderParameter( deferredVertexShader, gl.COMPILE_STATUS ) ) {
            
            console.error( gl.getShaderInfoLog( deferredVertexShader ) );

        }

        const deferredFragmentShader = gl.createShader( gl.FRAGMENT_SHADER );
        gl.shaderSource( deferredFragmentShader, deferredFsSource );
        gl.compileShader( deferredFragmentShader );

        if ( ! gl.getShaderParameter( deferredFragmentShader, gl.COMPILE_STATUS ) ) {
            
            console.error( gl.getShaderInfoLog( deferredFragmentShader ) );

        }

        this.deferredProgram = gl.createProgram();
        gl.attachShader( this.deferredProgram, deferredVertexShader );
        gl.attachShader( this.deferredProgram, deferredFragmentShader );
        gl.linkProgram( this.deferredProgram );

        if ( ! gl.getProgramParameter( this.deferredProgram, gl.LINK_STATUS ) ) {

            console.error( gl.getProgramInfoLog( this.deferredProgram ) );

        }


        // --------------------------- Get uniform locations --------------------------- //

        const sceneUniformsLocations = gl.getUniformBlockIndex( this.geoProgram, "SceneUniforms" );
        gl.uniformBlockBinding( this.geoProgram, sceneUniformsLocations, 0 );

        this.modelMatrixLocation    = gl.getUniformLocation( this.geoProgram, "uModel" );
        //const texLocation           = gl.getUniformLocation( this.geoProgram, "tex" );

        // dof uniforms

        this.sceneTextureLocation       = gl.getUniformLocation( this.dofProgram, "uSceneColor" );
        this.dofPositionTextureLocation = gl.getUniformLocation( this.dofProgram, "uPositionColor" );
        this.blurTextureLocation        = gl.getUniformLocation( this.dofProgram, "uBlurColor" );
        
        // deferred uniforms

        this.positionTextureLocation    = gl.getUniformLocation( this.deferredProgram, "uPositionTexture" );
        this.normalTextureLocation      = gl.getUniformLocation( this.deferredProgram, "uNormalTexture" );
        this.uvTextureLocation          = gl.getUniformLocation( this.deferredProgram, "uUvTexture" );
        this.resolutionLocation         = gl.getUniformLocation( this.deferredProgram, "uResolution" );



        // --------------------------- Setup framebuffers ----------------------------- //

        //gl.activeTexture(gl.TEXTURE0);
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

        // Box blur for DOF    
       

        this.depthTexture = gl.createTexture();
        gl.bindTexture( gl.TEXTURE_2D, this.depthTexture );
        gl.texImage2D( gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );        
        
        gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0 );

        gl.bindFramebuffer( gl.FRAMEBUFFER, null );

        this.blurTexture = gl.createTexture();
        gl.bindTexture( gl.TEXTURE_2D, this.blurTexture );
        gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );

        this.blurFBO = gl.createFramebuffer();
        gl.bindFramebuffer( gl.FRAMEBUFFER, this.blurFBO );
        gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.blurTexture, 0 );

        gl.bindFramebuffer( gl.FRAMEBUFFER, null );

         // --------------------------- Setup GBuffer ----------------------------- //

         this.gBuffer       = gl.createFramebuffer();
         gl.bindFramebuffer( gl.FRAMEBUFFER, this.gBuffer );
 
         this.positionTexture = gl.createTexture();
         gl.bindTexture( gl.TEXTURE_2D, this.positionTexture );
         gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, false );
         gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
         gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
         gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE ); 
         gl.texStorage2D( gl.TEXTURE_2D, 1, gl.RGBA16F, gl.drawingBufferWidth, gl.drawingBufferHeight );
         gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.positionTexture, 0 );
 
         this.normalTexture = gl.createTexture();
         gl.bindTexture( gl.TEXTURE_2D, this.normalTexture );
         gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, false );
         gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
         gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
         gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE ); 
         gl.texStorage2D( gl.TEXTURE_2D, 1, gl.RGBA16F, gl.drawingBufferWidth, gl.drawingBufferHeight );
         gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.normalTexture, 0 );
 
         this.uvTexture = gl.createTexture();
         gl.bindTexture( gl.TEXTURE_2D, this.uvTexture );
         gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, false );
         gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
         gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
         gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE ); 
         gl.texStorage2D( gl.TEXTURE_2D, 1, gl.RGBA16F, gl.drawingBufferWidth, gl.drawingBufferHeight );
         gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, this.uvTexture, 0 );

         this.diffuseTexture = gl.createTexture();
         gl.bindTexture( gl.TEXTURE_2D, this.diffuseTexture );
         gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, false );
         gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
         gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
         gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE ); 
         gl.texStorage2D( gl.TEXTURE_2D, 1, gl.RGBA16F, gl.drawingBufferWidth, gl.drawingBufferHeight );
         gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT3, gl.TEXTURE_2D, this.diffuseTexture, 0 );
 
         gl.drawBuffers([
 
             gl.COLOR_ATTACHMENT0,
             gl.COLOR_ATTACHMENT1,
             gl.COLOR_ATTACHMENT2,
             gl.COLOR_ATTACHMENT3
 
         ]);
 
         gl.bindFramebuffer( gl.FRAMEBUFFER, null );
        

        // --------------------------- Setup Geometry --------------------------- //

        this.numVertices    = character.verts.length / 3;

        // Statue

        this.statueArray     = gl.createVertexArray();
        gl.bindVertexArray( this.statueArray );

        
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( character.verts ), gl.STATIC_DRAW );
        gl.vertexAttribPointer( 0, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( 0 );        
        
        const uvBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, uvBuffer );
        gl.bufferData( gl.ARRAY_BUFFER,  new Float32Array( character.texcoords ), gl.STATIC_DRAW );
        gl.vertexAttribPointer( 1, 2, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( 1 );

        const normalBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( character.normals ), gl.STATIC_DRAW );
        gl.vertexAttribPointer( 2, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( 2 );        

        this.indicesBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.indicesBuffer );
        gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Uint16Array( character.indices ), gl.STATIC_DRAW );

        this.numOfStatueElements = character.indices.length;
        

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
        mat4.perspective( projMatrix, Math.PI / 2, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.01, 100. );

        const viewMatrix     = mat4.create();
        const eyePosition    = vec3.fromValues( 1, 5.5, 7 );

        mat4.lookAt( viewMatrix, eyePosition, vec3.fromValues( 0, 2.0, 0 ), vec3.fromValues( 0, 1, 0 ) );
        
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

        // Bind textures

        gl.activeTexture( gl.TEXTURE0 );
        gl.bindTexture( gl.TEXTURE_2D, this.sceneTexture );

        gl.activeTexture( gl.TEXTURE1 );
        gl.bindTexture( gl.TEXTURE_2D, this.blurTexture );

        gl.activeTexture( gl.TEXTURE2 );
        gl.bindTexture( gl.TEXTURE_2D, this.positionTexture );

        gl.activeTexture( gl.TEXTURE3 );
        gl.bindTexture( gl.TEXTURE_2D, this.normalTexture );

        gl.activeTexture( gl.TEXTURE4 );
        gl.bindTexture( gl.TEXTURE_2D, this.uvTexture );

        // gl.activeTexture( gl.TEXTURE5 );
        // gl.bindTexture( gl.TEXTURE_2D, this.diffuseTexture );


        requestAnimationFrame( this.draw.bind( this ) );

    }

    drawCharacter( gl ) {        

        gl.useProgram( this.geoProgram );
        gl.bindVertexArray( this.statueArray );

        //this.rotation.angleY += 0.01;

        mat4.fromXRotation( this.rotateXMatrix, this.rotation.angleX );
        mat4.fromYRotation( this.rotateYMatrix, this.rotation.angleY );
        mat4.multiply( this.modelMatrix, this.rotateXMatrix, this.rotateYMatrix );

        gl.uniformMatrix4fv( this.modelMatrixLocation, false, this.modelMatrix );

        gl.drawArrays( gl.TRIANGLES, 0, this.numVertices );

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

            // Draw to G buffer

            {   

                gl.bindFramebuffer( gl.FRAMEBUFFER, this.gBuffer );               
                

                gl.viewport (0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight );

                gl.clearColor( 0.0, 0.0, 0.0, 1.0);
                gl.enable( gl.DEPTH_TEST );

                // then before a draw
                gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT ); 
                
                this.drawCharacter( gl );

            }

            // Draw scene to buffer

            {   

                // gl.bindFramebuffer( gl.FRAMEBUFFER, this.sceneFBO );               
                

                // gl.viewport (0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight );

                // gl.clearColor( 1.0, 1.0, 1.0, 1.0);
                // gl.enable( gl.DEPTH_TEST );

                // // then before a draw
                // gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT ); 
                
                // this.drawCharacter( gl );

            }            

            // Draw blur scene

            {   

                // gl.bindFramebuffer( gl.FRAMEBUFFER, this.blurFBO );               

                // // Draw quad

                // gl.useProgram( this.boxBlurProgram );

                // gl.bindVertexArray( this.quadArray );

                // gl.viewport (0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight );

                // gl.clearColor(0.0, 0.0, 1.0, 1.0);
                // gl.enable( gl.DEPTH_TEST );

                // // then before a draw
                // gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

                // gl.drawArrays( gl.TRIANGLES, 0, 6 );

            }
            
            

            // Draw full screen quad

            {

                // gl.bindFramebuffer( gl.FRAMEBUFFER, null );           


                // // Draw quad

                // gl.useProgram( this.dofProgram );

                // gl.uniform1i( this.blurTextureLocation , 1 );
                // gl.uniform1i( this.dofPositionTextureLocation, 2 );

                // gl.bindVertexArray( this.quadArray );

                // gl.viewport (0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight );

                // gl.clearColor(0.0, 0.0, 0.0, 1.0);
                // gl.enable( gl.DEPTH_TEST );

                // // then before a draw
                // gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

                // gl.drawArrays( gl.TRIANGLES, 0, 6 );
               

            }




        }

        this.stats.end();
        
        requestAnimationFrame( this.draw.bind( this ) );

    }

}