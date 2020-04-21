#version 430 core

in layout(location = 0) vec3 position;
in layout(location = 1) vec3 normal;
in layout(location = 2) vec2 textureCoordinates_in;

out layout(location = 1) vec2 textureCoordinates;
//
//uniform layout(location = 3) mat4 projection;
//uniform layout(location = 4) mat4 model;
//uniform layout(location = 5) mat4 test;
//
//out layout(location = 2) vec3 position_out;
//out layout(location = 1) vec2 textureCoordinates_out;
//
//void main()
//{
////    position_out = vec3(model * vec4(position, 1));
//    textureCoordinates_out = textureCoordinates_in;
////    gl_Position = projection * model * vec4(position, 1.0f);
//    gl_Position = projection * model * vec4(position, 1);
//}

//in layout(location = 0) vec3 position;
uniform layout(location = 15) mat4 MVP;

void main(){
    textureCoordinates = textureCoordinates_in;
    gl_Position = MVP * vec4(position, 1);
}