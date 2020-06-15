
import Stats from 'Stats.js';
import Triangle from '../shaders/triangle/Triangle.js'

import ControlKit from 'controlkit';

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


export default class Scene {

    constructor() {

        this.canvas          = document.getElementById( 'c' );
        this.canvas.width    = window.innerWidth;
        this.canvas.height   = window.innerHeight;
        this.gl              = this.canvas.getContext( 'webgl2' );

        this.stats = new Stats();
        this.fps;
        this.fpsInterval;
        this.startTime;
        this.now;
        this.then;
        this.elapsed;

        document.body.appendChild( this.stats.domElement );

        var available_extensions = this.gl.getSupportedExtensions();
        this.gl.getExtension('EXT_shader_texture_lod');
        this.gl.getExtension('OES_standard_derivatives');

        const obj = { tiling: 10.0, range: [ 1.0, 10.0 ] };

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

        this.fps = 144;

        this.fpsInterval = 1000 / this.fps;
        this.then = Date.now();
        this.startTime = this.then;


        this.gl.clearColor( 0, 0, 0, 1 );

        // Setup program

        const vsSource = Triangle.vertexShader;
        const fsSource = Triangle.fragmentShader;

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

        this.gl.useProgram( program );

        // Setup Geometry

        const triangleArray = this.gl.createVertexArray();
        this.gl.bindVertexArray( triangleArray );

        const positions = new Float32Array( [

            -0.5, -0.5, 0.0,
            0.5, -0.5, 0.0,
            0.0, 0.5, 0.0

        ] );

        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, positionBuffer );
        this.gl.bufferData( this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW );
        this.gl.vertexAttribPointer( 0, 3, this.gl.FLOAT, false, 0, 0 );
        this.gl.enableVertexAttribArray( 0 );

        const colors = new Float32Array( [

            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0

        ] );

        const colorBuffer = this.gl.createBuffer();
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, colorBuffer );
        this.gl.bufferData( this.gl.ARRAY_BUFFER, colors, this.gl.STATIC_DRAW );
        this.gl.vertexAttribPointer( 1, 3, this.gl.FLOAT, false, 0, 0 );
        this.gl.enableVertexAttribArray( 1 );

        // Draw

        this.gl.clear( this.gl.COLOR_BUFFER_BIT );
        this.gl.drawArrays( this.gl.TRIANGLES, 0, 3 );


        //requestAnimationFrame( this.draw.bind( this ) );

    }

    draw( time ) {

        time *= 0.001;
        console.log( time );
    
        this.stats.begin();

        this.now = Date.now();
        this.elapsed = this.now - this.then;

        // if enough time has elapsed, draw the next frame

        let aspect = 1;

        if ( this.elapsed > this.fpsInterval ) {

            this.then = this.now - ( this.elapsed % this.fpsInterval );

            // Put your drawing code here


        }

        this.stats.end();
        
        requestAnimationFrame( this.draw.bind( this ) );

    }

}



// function render( time ) {

//     time *= 0.001;
    
//     stats.begin();

//     now = Date.now();
//     elapsed = now - then;

//     // if enough time has elapsed, draw the next frame

//     let aspect = 1;

//     if ( elapsed > fpsInterval ) {

//         then = now - ( elapsed % fpsInterval );

//         // Put your drawing code here
        
        
        


//     }

//     stats.end();
	
// 	requestAnimationFrame( render );

	

// }

// requestAnimationFrame( render );
