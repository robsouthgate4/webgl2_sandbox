#version 300 es

precision highp float;

uniform sampler2D uSceneTexture;

out vec4 fragColor;

void main() {


	ivec2 fragCoord = ivec2( gl_FragCoord.xy );

	ivec2 texSize = textureSize( uSceneTexture, 0 );

	fragColor = texelFetch( uSceneTexture, fragCoord, 0 );

	float size = 4.0;

	if (size <= 0.0) { return; }

	float separation = 1.0;
	separation = max(  separation, 1.0 );

	fragColor.rgb = vec3(0.0);

	for ( float i = -size; i <= size; ++i ) {

	 	for ( float j = -size; j <= size; ++j ) {

	 		fragColor.rgb += texture( uSceneTexture, ( vec2( fragCoord ) + ( vec2( i, j ) * separation ) ) / vec2( texSize ) ).rgb;

	 	}
	}

	fragColor.rgb /= pow( float( size ) * 2.0 + 1.0, 2.0 );

	fragColor.a		= 1.0;

}