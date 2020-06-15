/**
Triangle
 */

import vertexShader from './triangle.vert'
import fragmentShader from './triangle.frag'


const Triangle = {

	uniforms: {
		time: { type: 'f', value: 0.0 },
		resolution: { type: 'v2', value: 0.0 }		
	},

	vertexShader,
	fragmentShader
};

export default Triangle;
