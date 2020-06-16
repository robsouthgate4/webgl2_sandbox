
import Stats from 'Stats.js';
import Geo from '../shaders/geo/geo.js'
import Composite from '../shaders/composite/composite.js'
import ControlKit from 'controlkit';

import '../utils/utils'

import statue from '../../assets/models/statue.json'

//let statue = utils.createSphere( {radius: 2.0 } );

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
        this.compositeProgram;

        this.statueArray;
        this.quadArray;

        this.numOfStatueElements;

        this.dofUniformBuffer;

        // FBOs

        this.sceneTexture;
        this.depthTexture;
        this.blurTexture;
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

        document.body.appendChild( this.stats.domElement );

        const obj = { amount: 0 };

        this.cubeRotation = {

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
        
        // --------------------------- Setup Composition program --------------------------- //


        const compositeVsSource       = Composite.vertexShader;
        const compositeFsSource       = Composite.fragmentShader;

        const compositeVertexShader       = gl.createShader( gl.VERTEX_SHADER );
        gl.shaderSource( compositeVertexShader, compositeVsSource );
        gl.compileShader( compositeVertexShader );

        if ( ! gl.getShaderParameter( compositeVertexShader, gl.COMPILE_STATUS ) ) {
            
            console.error( gl.getShaderInfoLog( compositeVertexShader ) );

        }

        const compositeFragmentShader = gl.createShader( gl.FRAGMENT_SHADER );
        gl.shaderSource( compositeFragmentShader, compositeFsSource );
        gl.compileShader( compositeFragmentShader );

        if ( ! gl.getShaderParameter( compositeFragmentShader, gl.COMPILE_STATUS ) ) {
            
            console.error( gl.getShaderInfoLog( compositeFragmentShader ) );

        }

        this.compositeProgram = gl.createProgram();
        gl.attachShader( this.compositeProgram, compositeVertexShader );
        gl.attachShader( this.compositeProgram, compositeFragmentShader );
        gl.linkProgram( this.compositeProgram );

        if ( ! gl.getProgramParameter( this.compositeProgram, gl.LINK_STATUS ) ) {

            console.error( gl.getProgramInfoLog( this.compositeProgram ) );

        }


        // --------------------------- Get uniform locations --------------------------- //

        const sceneUniformsLocations = gl.getUniformBlockIndex( this.geoProgram, "SceneUniforms" );
        gl.uniformBlockBinding( this.geoProgram, sceneUniformsLocations, 0 );

        this.modelMatrixLocation    = gl.getUniformLocation( this.geoProgram, "uModel" );
        const texLocation           = gl.getUniformLocation( this.geoProgram, "tex" );


        
        this.sceneTextureLocation       = gl.getUniformLocation( this.compositeProgram, "uSceneColor" );
        this.depthTextureLocation       = gl.getUniformLocation( this.compositeProgram, "uDepthColor" );
        this.blurTextureLocation        = gl.getUniformLocation( this.compositeProgram, "uBlurredTexture" );
        this.positionTextureLocation    = gl.getUniformLocation( this.compositeProgram, "uPositionTexture" );
        this.normalTextureLocation      = gl.getUniformLocation( this.compositeProgram, "uNormalTexture" );
        this.uvTextureLocation          = gl.getUniformLocation( this.compositeProgram, "uUvTexture" );
        this.resolutionLocation         = gl.getUniformLocation( this.compositeProgram, "uResolution" );


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

    
        this.blurTexture = gl.createTexture();
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

        gl.activeTexture( gl.TEXTURE2 );
        this.positionTexture = gl.createTexture();
        gl.bindTexture( gl.TEXTURE_2D, this.positionTexture );
        gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, false );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE ); 
        gl.texStorage2D( gl.TEXTURE_2D, 1, gl.RGBA16F, gl.drawingBufferWidth, gl.drawingBufferHeight );
        gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.positionTexture, 0 );

        gl.activeTexture( gl.TEXTURE3 );
        this.normalTexture = gl.createTexture();
        gl.bindTexture( gl.TEXTURE_2D, this.normalTexture );
        gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, false );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE ); 
        gl.texStorage2D( gl.TEXTURE_2D, 1, gl.RGBA16F, gl.drawingBufferWidth, gl.drawingBufferHeight );
        gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.normalTexture, 0 );

        gl.activeTexture( gl.TEXTURE4 );
        this.uvTexture = gl.createTexture();
        gl.bindTexture( gl.TEXTURE_2D, this.uvTexture );
        gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, false );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE ); 
        gl.texStorage2D( gl.TEXTURE_2D, 1, gl.RG16F, gl.drawingBufferWidth, gl.drawingBufferHeight );
        gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, this.uvTexture, 0 );

        this.depthTexture = gl.createTexture();
        gl.bindTexture( gl.TEXTURE_2D, this.depthTexture );
        gl.texImage2D( gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );        
        
        gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0 );

        gl.drawBuffers([

            gl.COLOR_ATTACHMENT0,
            gl.COLOR_ATTACHMENT1,
            gl.COLOR_ATTACHMENT2

        ]);

        gl.bindFramebuffer( gl.FRAMEBUFFER, null );
        

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
        gl.bufferData( gl.ARRAY_BUFFER,  new Float32Array( statue.texcoords ), gl.STATIC_DRAW );
        gl.vertexAttribPointer( 1, 2, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( 1 );

        const normalBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( statue.normals ), gl.STATIC_DRAW );
        gl.vertexAttribPointer( 2, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( 2 );
        

        this.indicesBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.indicesBuffer );
        gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Uint16Array( statue.indices ), gl.STATIC_DRAW );

        this.numOfStatueElements = statue.indices.length;
        

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
        const eyePosition    = vec3.fromValues( 1, 2.5, 4 );

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
        gl.bindTexture( gl.TEXTURE_2D, this.depthTexture );
        gl.activeTexture( gl.TEXTURE2 );
        gl.bindTexture( gl.TEXTURE_2D, this.positionTexture );
        gl.activeTexture( gl.TEXTURE3 );
        gl.bindTexture( gl.TEXTURE_2D, this.normalTexture );
        gl.activeTexture( gl.TEXTURE4 );
        gl.bindTexture( gl.TEXTURE_2D, this.uvTexture );
        gl.activeTexture( gl.TEXTURE5 );
        gl.bindTexture( gl.TEXTURE_2D, this.blurTexture );

        gl.useProgram( this.compositeProgram );
        gl.uniform2f( this.resolutionLocation, gl.drawingBufferWidth, gl.drawingBufferHeight );
        
        // Set composition program uniforms

        gl.uniform1i( this.sceneTextureLocation, 0 );
        gl.uniform1i( this.depthTextureLocation, 1 );
        gl.uniform1i( this.positionTextureLocation, 2 );        
        gl.uniform1i( this.normalTextureLocation, 3 );
        gl.uniform1i( this.uvTextureLocation, 4 );

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

            {
               

                gl.bindFramebuffer( gl.FRAMEBUFFER, this.gBuffer );

                gl.useProgram( this.geoProgram );
                gl.bindVertexArray( this.statueArray );

                this.cubeRotation.angleY += 0.01;

                mat4.fromXRotation( this.rotateXMatrix, this.cubeRotation.angleX );
                mat4.fromYRotation( this.rotateYMatrix, this.cubeRotation.angleY );
                mat4.multiply( this.modelMatrix, this.rotateXMatrix, this.rotateYMatrix );

                gl.uniformMatrix4fv( this.modelMatrixLocation, false, this.modelMatrix );

                gl.viewport (0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight );

                gl.clearColor(0.0, 0.0, 0.0, 1.0);
                gl.enable( gl.DEPTH_TEST );

                // then before a draw
                gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

                gl.drawArrays( gl.TRIANGLES, 0, this.numVertices );

            }

            // Draw blur pass

            {


            }

            // Draw composition

            {

                gl.bindFramebuffer( gl.FRAMEBUFFER, null );           


                // Draw quad

                gl.useProgram( this.compositeProgram );

                gl.bindVertexArray( this.quadArray );

                gl.viewport (0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight );

                gl.clearColor(0.0, 0.0, 0.0, 1.0);
                gl.enable( gl.DEPTH_TEST );

                // then before a draw
                gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

                gl.drawArrays( gl.TRIANGLES, 0, 6 );

               

            }




        }

        this.stats.end();
        
        requestAnimationFrame( this.draw.bind( this ) );

    }

}