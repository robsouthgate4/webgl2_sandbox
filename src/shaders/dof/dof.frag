#version 300 es

precision highp float;


uniform sampler2D uSceneColor;
uniform sampler2D uBlurColor;
uniform sampler2D uPositionColor;
uniform vec2      uResolution;

out vec4 fragColor;

void main() {

    ivec2 fragCoord = ivec2( gl_FragCoord.xy );

    vec3 scene      = texelFetch( uSceneColor, fragCoord, 0 ).rgb;
    vec3 blur       = texelFetch( uBlurColor, fragCoord, 0 ).rgb;
    vec3 position   = texelFetch( uPositionColor, fragCoord, 0 ).rgb;

  	fragColor       = vec4( position, 1.0 );

}