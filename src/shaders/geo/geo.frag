#version 300 es

precision highp float;

layout( std140, column_major ) uniform;

uniform SceneUniforms {

    mat4 viewProj;
    vec4 eyePosition;
    vec4 lightPosition;
    
} uScene;

uniform sampler2D uTexture;

in vec4 vPosition;
in vec4 vUv;
in vec3 vNormal;

layout(location=0) out vec4 fragPosition;
layout(location=1) out vec4 fragNormal;
layout(location=2) out vec4 fragUV; 
layout(location=4) out vec4 diffuseColor;

//out vec4 fragColor;

void main() {

    vec3 color          = vec3( 0.7, 0.7, 0.0 );
    vec3 normal         = normalize( vNormal );
    vec3 eyeVec         = normalize( uScene.eyePosition.xyz - vPosition.xyz );
    vec3 incidentVec    = normalize( vPosition.xyz - uScene.lightPosition.xyz );
    vec3 lightVec       = -incidentVec;
    float diffuse       = max( dot( lightVec, normal ), 0.0 );
    float spec          = pow( max( dot( eyeVec, reflect( incidentVec, normal ) ), 0.0 ), 100.0 );
    float ambient       = 0.1;

    fragPosition        = vPosition;
    fragNormal          = vec4( normalize( vNormal.xyz ), 1.0 );
    fragUV              = vUv;

    diffuseColor         = vec4( color * ( ambient + diffuse + spec ), 1.0 );

}