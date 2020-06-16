#version 300 es

precision highp float;

layout( std140, column_major ) uniform;

uniform SceneUniforms {

    mat4 viewProj;
    vec4 eyePosition;
    vec4 lightPosition;
    
} uScene;

uniform sampler2D tex;

in vec4 vPosition;
in vec4 vUv;
in vec3 vNormal;

layout(location=0) out vec4 fragPosition;
layout(location=1) out vec4 fragNormal;
layout(location=2) out vec4 fragUV; 
layout(location=3) out vec4 difuse;

void main() {

    // vec3 color          = vec3( 0.7, 0.7, 0.7 );
    // vec3 normal         = normalize( vNormal );
    // vec3 eyeVec         = normalize( uScene.eyePosition.xyz - vPosition );
    // vec3 incidentVec    = normalize( vPosition - uScene.lightPosition.xyz );
    // vec3 lightVec       = -incidentVec;
    // float diffuse       = max( dot( lightVec, normal ), 0.0 );
    // float spec          = pow( max( dot( eyeVec, reflect( incidentVec, normal ) ), 0.0 ), 100.0 );
    // float ambient       = 0.1;

    fragPosition        = vPosition;
    fragNormal          = vec4( normalize( vNormal.xyz ), 1.0 );
    fragUV              = vUv;

}