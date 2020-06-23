/**
Depth of field
 */

import vertexShader from '../quad.vert'
import fragmentShader from './deferred.frag'


const DEFERRED = {

	uniforms: {
		
	},

	vertexShader,
	fragmentShader
	
};

export default DEFERRED;
