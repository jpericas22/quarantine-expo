#ifdef GL_ES
precision highp float;
#endif
#define PI 3.1415926535897932384626433832795

varying vec3 vUv;
uniform sampler2D texture_main;
uniform float time;
uniform float size;
uniform float rangeOffset;
uniform float speedMultiplier;
uniform float sinShapeModifier;
uniform float brightnessMultiplier;
uniform float opacityMultiplier;
uniform float brightnessOffset;
void main() {
    vec4 color = texture2D(texture_main, vUv.xy);
    float timeVal = fract(time * speedMultiplier) * (1.0 + (size*2.0) + (rangeOffset * 2.0)) - (size + rangeOffset);
    vec2 pos = vec2((vUv.x - size), (vUv.x + size));
    if(pos.x < timeVal && pos.y > timeVal){
        float rangePos = (timeVal - pos.x) / (pos.y - pos.x);
        float sinPos = rangePos * PI;
        float brightnessValue = pow(sin(sinPos),sinShapeModifier);
        brightnessValue *= brightnessMultiplier;
        color.rgb += brightnessValue;
    }
    color.a *= opacityMultiplier;
    color.rgb += vec3(brightnessOffset);
    gl_FragColor = color;
}