
import Stats from 'Stats.js';
import Cube from '../shaders/phong/phong.js'

import ControlKit from 'controlkit';

import '../utils/utils'

import statue from '../../assets/models/statue.json'

import roughnessMap from '../../assets/textures/broken_tiles_high/roughness.png';
//import metallicMap from '../../assets/textures/broken_tiles_high/grimy-metal-metalness.png';
import albedoMap from '../../assets/textures/broken_tiles_high/albedo.png';
import normalMap from '../../assets/textures/broken_tiles_high/normals.png';
//import aoMap from '../../assets/textures/stylised_rock/stylized-cliff1-ao.png';
import heightMap from '../../assets/textures/broken_tiles_high/displacement.png';

import rnx from '../../assets/textures/radiance/nx.png';
import rny from '../../assets/textures/radiance/ny.png';
import rnz from '../../assets/textures/radiance/nz.png';
import rpx from '../../assets/textures/radiance/px.png';
import rpy from '../../assets/textures/radiance/py.png';
import rpz from '../../assets/textures/radiance/pz.png';

import irnx from '../../assets/textures/town_env/irradiance/output_iem_negx.png';
import irny from '../../assets/textures/town_env/irradiance/output_iem_negy.png';
import irnz from '../../assets/textures/town_env/irradiance/output_iem_negz.png';
import irpx from '../../assets/textures/town_env/irradiance/output_iem_posx.png';
import irpy from '../../assets/textures/town_env/irradiance/output_iem_posy.png';
import irpz from '../../assets/textures/town_env/irradiance/output_iem_posz.png';

import nx from '../../assets/textures/town_env/env/output_skybox_negx.png';
import ny from '../../assets/textures/town_env/env/output_skybox_negy.png';
import nz from '../../assets/textures/town_env/env/output_skybox_negz.png';
import px from '../../assets/textures/town_env/env/output_skybox_posx.png';
import py from '../../assets/textures/town_env/env/output_skybox_posy.png';
import pz from '../../assets/textures/town_env/env/output_skybox_posz.png';

import { mat4, vec3 } from '../utils/gl-matrix.js';


export default class StatueScene {

    constructor() {

        this.canvas          = document.getElementById( 'c' );
        this.canvas.width    = window.innerWidth;
        this.canvas.height   = window.innerHeight;
        this.gl              = this.canvas.getContext( 'webgl2' );

        if ( ! this.gl ) {

            console.error( "WebGL 2 not available" );

        }
        this.gl.viewport( 0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight );
        this.gl.clearColor( 0, 0, 0, 1 );
        this.gl.enable( this.gl.DEPTH_TEST );

        this.stats = new Stats();
        this.fps;
        this.fpsInterval;
        this.startTime;
        this.now;
        this.then;
        this.elapsed;

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

    async _setup() {        

        this.fps = 144;

        this.fpsInterval = 1000 / this.fps;
        this.then = Date.now();
        this.startTime = this.then;


        this.gl.clearColor( 0, 0, 0, 1 );

        // Setup program

        const vsSource = Cube.vertexShader;
        const fsSource = Cube.fragmentShader;

        const vertexShader = this.gl.createShader( this.gl.VERTEX_SHADER );
        this.gl.shaderSource( vertexShader, vsSource );
        this.gl.compileShader( vertexShader );

        if ( ! this.gl.getShaderParameter( vertexShader, this.gl.COMPILE_STATUS ) ) {

            console.error( this.gl.getShaderInfoLog( vertexShader ) );

        }

        const fragmentShader = this.gl.createShader( this.gl.FRAGMENT_SHADER );
        this.gl.shaderSource( fragmentShader, fsSource );
        this.gl.compileShader( fragmentShader );

        if ( ! this.gl.getShaderParameter( fragmentShader, this.gl.COMPILE_STATUS ) ) {

            console.error( this.gl.getShaderInfoLog( fragmentShader ) );

        }

        const program = this.gl.createProgram();
        this.gl.attachShader( program, vertexShader );
        this.gl.attachShader( program, fragmentShader );
        this.gl.linkProgram( program );

        if ( ! this.gl.getProgramParameter( program, this.gl.LINK_STATUS ) ) {

            console.error( this.gl.getProgramInfoLog( program ) );

        }        

        // Get uniform locations

        const sceneUniformsLocations = this.gl.getUniformBlockIndex( program, "SceneUniforms" );
        this.gl.uniformBlockBinding( program, sceneUniformsLocations, 0 );

        this.modelMatrixLocation   = this.gl.getUniformLocation( program, "uModel" );
        const texLocation           = this.gl.getUniformLocation( program, "tex" );

        this.gl.useProgram( program );

        // Setup Geometry

        this.numVertices    = statue.verts.length / 3;

        const cubeArray     = this.gl.createVertexArray();
        this.gl.bindVertexArray( cubeArray );
        
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, positionBuffer );
        this.gl.bufferData( this.gl.ARRAY_BUFFER, new Float32Array( statue.verts ), this.gl.STATIC_DRAW );
        this.gl.vertexAttribPointer( 0, 3, this.gl.FLOAT, false, 0, 0 );
        this.gl.enableVertexAttribArray( 0 );

        const uvBuffer = this.gl.createBuffer();
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, uvBuffer );
        this.gl.bufferData( this.gl.ARRAY_BUFFER, new Float32Array( statue.texcoords ), this.gl.STATIC_DRAW );
        this.gl.vertexAttribPointer( 1, 2, this.gl.FLOAT, false, 0, 0 );
        this.gl.enableVertexAttribArray( 1 );

        const normalBuffer = this.gl.createBuffer();
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, normalBuffer );
        this.gl.bufferData( this.gl.ARRAY_BUFFER, new Float32Array( statue.normals ), this.gl.STATIC_DRAW );
        this.gl.vertexAttribPointer( 2, 3, this.gl.FLOAT, false, 0, 0 );
        this.gl.enableVertexAttribArray( 2 );

        // Uniform data

        const projMatrix     = mat4.create();
        mat4.perspective( projMatrix, Math.PI / 2, this.gl.drawingBufferWidth / this.gl.drawingBufferHeight, 0.1, 100. );

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

        const sceneUniformBuffer = this.gl.createBuffer();
        this.gl.bindBufferBase( this.gl.UNIFORM_BUFFER, 0, sceneUniformBuffer );
        this.gl.bufferData( this.gl.UNIFORM_BUFFER, sceneUniformData, this.gl.STATIC_DRAW );

        // Draw

        requestAnimationFrame( this.draw.bind( this ) );

    }

    draw( time ) {

        time *= 0.001;
    
        this.stats.begin();

        this.now = Date.now();
        this.elapsed = this.now - this.then;

        // if enough time has elapsed, draw the next frame

        let aspect = 1;

        if ( this.elapsed > this.fpsInterval ) {

            this.then = this.now - ( this.elapsed % this.fpsInterval );

            //this.cubeRotation.angleX += 0.01;
            this.cubeRotation.angleY += 0.01;

            mat4.fromXRotation( this.rotateXMatrix, this.cubeRotation.angleX );
            mat4.fromYRotation( this.rotateYMatrix, this.cubeRotation.angleY );
            mat4.multiply( this.modelMatrix, this.rotateXMatrix, this.rotateYMatrix );

            this.gl.uniformMatrix4fv( this.modelMatrixLocation, false, this.modelMatrix );

            this.gl.clear( this.gl.COLOR_BUFFER_BIT );
            this.gl.drawArrays( this.gl.TRIANGLES, 0, this.numVertices );


        }

        this.stats.end();
        
        requestAnimationFrame( this.draw.bind( this ) );

    }

}