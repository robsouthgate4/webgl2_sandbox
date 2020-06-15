#version 300 es

precision highp float;


uniform sampler2D uSceneColor;
uniform sampler2D uDepthColor;
uniform vec2     uResolution;

out vec4 fragColor;

void main() {

    ivec2 fragCoord = ivec2( gl_FragCoord.xy );

    vec3 scene      = texture( uSceneColor, gl_FragCoord.xy / uResolution ).xyz;
    float depth     = texture( uDepthColor, gl_FragCoord.xy / uResolution ).x;

  	fragColor = vec4( vec3( depth ), 1.0 );

}