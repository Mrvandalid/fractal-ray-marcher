#version 430 core

//struct LightSource {
//    vec3 position;
//    vec4 color;
//};

in layout(location = 1) vec2 textureCoordinates;

//uniform layout(location = 6) vec3 cameraPos;

layout(binding = 0) uniform sampler2D mainTextureSampler;
//layout(rgba32f, binding = 0) uniform image2D output_img;

//uniform LightSource lights[3];

out vec4 color;

float rand(vec2 co) { return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453); }
float dither(vec2 uv) { return (rand(uv)*2.0-1.0) / 256.0; }

//vec3 project(vec3 a, vec3 b){
//    vec3 bN = b / length(b);
//    return dot(a, bN) * bN;
//}

void main()
{
//    vec4 pixelValue = imageLoad(output_img, ivec2(gl_FragCoord.xy));
    color = texture(mainTextureSampler, textureCoordinates) + dither(textureCoordinates);
//    color = pixelValue;//texture(mainTextureSampler, textureCoordinates);
}