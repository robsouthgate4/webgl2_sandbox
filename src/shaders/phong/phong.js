/**
Phong
 */

import vertexShader 	from './phong.vert'
import fragmentShader 	from './phong.frag'


const Phong = {

	uniforms: {
		time: { type: 'f', value: 0.0 },
		resolution: { type: 'v2', value: 0.0 }		
	},

	vertexShader,
	fragmentShader
};

export default Phong;
