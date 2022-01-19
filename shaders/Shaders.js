import * as THREE from "../build/three.module";

//twist material, modified phong shader (reflects lights, receives shadows)
//amount = altitude of the motion
//time = variant of the motion (time passed is a consistent landslide like, Math.random() is a earthquake like)
export function buildTwistMaterial(amount, time, color, map ) {
    const material2 = new THREE.MeshPhongMaterial({
        color: color,
        map: map
    });

    material2.onBeforeCompile = function ( shader ) {
        shader.uniforms.time = { value: time };

        shader.vertexShader = 'uniform float time;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            [
                `float theta = sin( time + position.y ) / ${ amount.toFixed( 1 ) };`,
                'float c = cos( theta );',
                'float s = sin( theta );',
                'mat3 m = mat3( c, 0, s, 0, 1, 0, -s, 0, c );',
                'vec3 transformed = vec3( position ) * m;',
                'vNormal = vNormal * m;'
            ].join( '\n' )
        );
        material2.userData.shader = shader;
    };

    return material2;
}

//custom phong shader (reflects light, no shadows)
//
export function CustomPhongShader(Ka, Kd, Ks, LInt, LPos, S) {
    return new THREE.ShaderMaterial({
        uniforms: {
            Ka: {value: Ka}, //object's color
            Kd: {value: Kd}, //light reflecting surface's color (blends with object's color)
            Ks: {value: Ks}, //reflected light color
            LightIntensity: {value: LInt}, //intensity of the light
            LightPosition: {value: LPos}, //position of the light
            Shininess: {value: S} //shininess of the object (higher is more focused and metallic)
        },
        vertexShader: `
      varying vec3 Normal;
      varying vec3 Position;
      void main() {
        Normal = normalize(normalMatrix * normal);
        Position = vec3(modelViewMatrix * vec4(position, 1.0));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
        fragmentShader: `
      varying vec3 Normal;
      varying vec3 Position;
      uniform vec3 Ka;
      uniform vec3 Kd;
      uniform vec3 Ks;
      uniform vec4 LightPosition;
      uniform vec3 LightIntensity;
      uniform float Shininess;
      vec3 phong() {
        vec3 n = normalize(Normal);
        vec3 s = normalize(vec3(LightPosition) - Position);
        vec3 v = normalize(vec3(-Position));
        vec3 r = reflect(-s, n);
        vec3 ambient = Ka;
        vec3 diffuse = Kd * max(dot(s, n), 0.0);
        vec3 specular = Ks * pow(max(dot(r, v), 0.0), Shininess);
        return LightIntensity * (ambient + diffuse + specular);
      }
      void main() {
        gl_FragColor = vec4(phong(), 1.0);
      }
    `
    });
}