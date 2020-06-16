/**
Box blur
 */

import vertexShader from '../quad.vert'
import fragmentShader from './boxBlur.frag'


const BOXBLUR = {

	uniforms: {
		
	},

	vertexShader,
	fragmentShader
	
};

export default BOXBLUR;
