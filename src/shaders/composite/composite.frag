#version 300 es

precision highp float;


uniform sampler2D uDepthColor;
uniform vec2     uResolution;

uniform sampler2D uPositionTexture;
uniform sampler2D uNormalTexture;
uniform sampler2D uUvTexture;
uniform sampler2D uBlurredTexture;

out vec4 fragColor;

void main() {

    ivec2 fragCoord = ivec2( gl_FragCoord.xy );
  
    vec3 normal     = texelFetch( uNormalTexture, fragCoord, 0 ).rgb;
    vec3 position   = texelFetch( uPositionTexture, fragCoord, 0 ).rgb;
    vec3 uv         = texelFetch( uUvTexture, fragCoord, 0 ).rgb;

    float depth     = ( length( position ) - 0.01) / (100. - 0.01);

  	fragColor       = vec4( normal, 1.0 );

}