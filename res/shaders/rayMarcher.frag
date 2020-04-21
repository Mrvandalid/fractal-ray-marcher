#version 450 core

#define pi 3.141592653
in layout(location = 1) vec2 textureCoordinates;

out vec4 color;

float rand(vec2 co) { return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453); }
float dither(vec2 uv) { return (rand(uv)*2.0-1.0) / 256.0; }

uniform layout(location = 5) vec3 cameraPosition;
uniform layout(location = 6) vec3 lowerLeft;
uniform layout(location = 7) vec3 deltaU;
uniform layout(location = 8) vec3 deltaV;

uniform layout(location = 9) float time;

uniform layout(location = 10) vec3 debug;
uniform layout(location = 11) vec3 debug2;
uniform layout(location = 12) ivec3 misc;// minAspect;

int minAspect = misc.x;
int scene = misc.y;
int reflectionBounces = misc.z;
//uniform layout(location = 13) int scene;

vec3[3] colorIndex;

const vec3 defaultColor = vec3(1);

const int samplingAA = 1;// Use to enable anti-aliasing. 1 = no aa, 2 = 4 samples, 3 = 9 samples etc. Very expensive.

float reflectivity = 0.5;
vec4[4] reflectionColors;

float globalScale = 1;

vec3 sunDir = vec3(-0.81f, 0.51f, -0.3f);
vec3 sunColor = vec3(1.6, 1.2, 1);

float shininess = 32;
float specIntensity = 0.5f;

vec3 skyColor = vec3(0.0, 0.05, 0.1);
vec3 topColor = vec3(0.2, 0.6f, 0.7f);
vec3 botColor = vec3(0.5f, 0.5f, 0.5f);
float backgroundBlend = .3f;

float minStepSize = 0.001f;
float detectionLength = 0.002;

float sqrLength(vec3 vector){
    return dot(vector, vector);
}

// These are signed distance field functions. Credit to Inigo Quilez:
// https://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm
float sdSphere(in vec4 point, in float radius){
    float shape = length(point.xyz) - radius;
    return shape * point.w;
}

float sdBox(in vec4 point, in  vec3 size){
    vec3 difference = abs(point.xyz) - size;
    float shape = length(max(difference, 0)) + min(max(difference.x, max(difference.y, difference.z)), 0);
    return shape * point.w;
}

float sdPlane(in vec4 point, in vec3 normal, in  float offsetOrigin){
    float shape = dot(point.xyz, normal) + offsetOrigin;
    return shape * point.w;
}

float sdCapsule(vec4 point, vec3 start, vec3 end, float r){
    vec3 startToRef = point.xyz - start;
    vec3 startToEnd = end - start;
    float h = clamp(dot(startToRef, startToEnd) / dot(startToEnd, startToEnd), 0.0, 1.0);
    float shape =length(startToRef - startToEnd * h) - r;
    return shape * point.w;
}

float sdCone(vec4 point, float angle){
    // c is the sin/cos of the angle
    vec2 tip = vec2(sin(angle), cos(angle));
    float radius = length(point.xy);
    float shape = dot(tip, vec2(radius, point.z));
    return shape * point.w;
}

float sdSolidAngle(vec4 point, vec2 sinCosAngle, float size){
    // I am not going to pretend to understand how this works.
    vec2 height = vec2(length(point.xz), point.y);
    float width = length(height) - size;
    float dome = length(height - sinCosAngle * clamp(dot(height, sinCosAngle), 0.0, size));
    float shape = max(width, dome * sign(sinCosAngle.y * height.x - sinCosAngle.x * height.y));
    return shape * point.w;
}

float sdTerrain(vec4 point){
    float displacement = sin(point.x) * sin(point.z);
    float height = sdPlane(point, vec3(0, 1, 0), 5);
    return height + displacement * (1 + debug.x * 0.1);
}

float sdTorus(vec4 point, vec2 radius){
    vec2 outerRadius = vec2(length(point.xz)-radius.x, point.y);
    return (length(outerRadius)-radius.y) / point.w;
}

float smoothBevel(in float sdFunction, float radius){
    return sdFunction - radius;
}

float onion(in float sdFunction, float thickness){
    return abs(sdFunction) - thickness;
}

float smoothMin(float sdFunctionA, float sdFunctionB, float radius){
    float distance = max(radius - abs(sdFunctionA - sdFunctionB), 0.0) / radius;
    return min(sdFunctionA, sdFunctionB) - distance * distance * distance * radius * (1.0 / 6.0);
}


float udSqrTriangle(vec3 p, vec3 a, vec3 b, vec3 c){
    vec3 ba = b - a; vec3 pa = p - a;
    vec3 cb = c - b; vec3 pb = p - b;
    vec3 ac = a - c; vec3 pc = p - c;
    vec3 nor = cross(ba, ac);

    return
    (sign(dot(cross(ba, nor), pa)) +
    sign(dot(cross(cb, nor), pb)) +
    sign(dot(cross(ac, nor), pc))<2.0)
    ?
    min(min(
    sqrLength(ba*clamp(dot(ba, pa)/sqrLength(ba), 0.0, 1.0)-pa),
    sqrLength(cb*clamp(dot(cb, pb)/sqrLength(cb), 0.0, 1.0)-pb)),
    sqrLength(ac*clamp(dot(ac, pc)/sqrLength(ac), 0.0, 1.0)-pc))
    :
    dot(nor, pa)*dot(nor, pa)/sqrLength(nor);
}


float dTetrahedron(in vec3 point){
    float x = point.x;
    float y = point.y;
    float z = point.z;
    float maxDist = max(max(-x - y - z, x + y - z), max(-x + y + z, x - y + z));
    return (maxDist - 1) / (length(point) * (1.73205080757));
}

vec4 repeat(in vec4 point, in vec3 center){
    return vec4(mod(point.xyz + 0.5 * center, center) - 0.5 * center, point.w);
}

vec4 rotationAlign(in vec4 point, in const vec3 from, in const vec3 to)
{
    const vec3  v = cross(to, from);
    const float c = dot(to, from);
    const float k = 1.0f/(1.0f+c);

    mat3 rot = mat3(v.x*v.x*k + c, v.y*v.x*k - v.z, v.z*v.x*k + v.y,
    v.x*v.y*k + v.z, v.y*v.y*k + c, v.z*v.y*k - v.x,
    v.x*v.z*k - v.y, v.y*v.z*k + v.x, v.z*v.z*k + c);

    point.xyz = rot * point.xyz;
    return point;
}

vec4 rotateX(in vec4 point, vec2 sinCosAngle){
    float ca = sinCosAngle.y;
    float sa = sinCosAngle.x;
    mat3 rotation = mat3(
    1, 0, 0,
    0, ca, sa,
    0, -sa, ca
    );
    return vec4(rotation * point.xyz, point.w);
}

vec4 rotateY(in vec4 point, vec2 sinCosAngle){
    float ca = sinCosAngle.y;
    float sa = sinCosAngle.x;
    mat3 rotation = mat3(
    ca, 0, sa,
    0, 1, 0,
    -sa, 0, ca
    );
    return vec4(rotation * point.xyz, point.w);
}

vec4 rotateZ(in vec4 point, vec2 sinCosAngle){
    float ca = sinCosAngle.y;
    float sa = sinCosAngle.x;
    mat3 rotation = mat3(
    ca, -sa, 0,
    sa, ca, 0,
    0, 0, 1
    );
    return vec4(rotation * point.xyz, point.w);
}

vec4 translate(in vec4 point, vec3 translation){
    point.xyz -= translation;
    return point;
}

vec4 scale(in vec4 point, in float amount){
    point.xyz /= amount;
    point.w *= amount;
    return point;
}

vec4 foldPlane(in vec4 point, vec3 planeNormal, float offset){
    point.xyz -= 2.0 * min(0.0, dot(point.xyz, planeNormal) - offset) * planeNormal;
    return point;
}

vec4 foldPlane(in vec4 point, vec3 planeNormal){
    return foldPlane(point, planeNormal, 0);
}

vec4 foldAbs(in vec4 point, in vec3 center){
    point.xyz = abs(point.xyz - center) + center;
    return point;
}

// Both of these folds are basically specific plane folds in a specific order. They are also written without
// conditionals for performance.

vec4 foldSierpinski(in vec4 point){
    point.xy -= min(point.x + point.y, 0);
    point.xz -= min(point.x + point.z, 0);
    point.yz -= min(point.z + point.y, 0);
    return point;
}

vec4 foldMenger(in vec4 point){
    float m = min(point.x - point.y, 0);
    point.x -= m;
    point.y += m;
    m = min(point.x - point.z, 0);
    point.x -= m;
    point.z += m;
    m = min(point.y - point.z, 0);
    point.y -= m;
    point.z += m;
    return point;
}

vec4 foldSphere(in vec4 point, float minRadius, float maxRadius){
    float radius2 = sqrLength(point.xyz);
    float modifier = max(maxRadius / max(minRadius, radius2), 1);
    point.xyz *= modifier;
    point.w /= modifier;
    return point;
}

vec4 foldBox(in vec4 point, vec3 size){
    point.xyz = clamp(point.xyz, -size, size) * 2 - point.xyz;
    return point;
}

float mandelBulb(in vec4 point){
    vec3 p = point.xyz;
    float m = sqrLength(p);
    float derivative = 1;
    float power = 8;

    int iterations = 4;
    for (int i = 0; i < iterations; i++){
        //        r = length(p);
        //        if (r > 10 + debugDepth){
        //            break;
        //        }
        float r = length(p);
        float phi = power * atan(p.x, p.z);
        float theta = power * acos(p.y/r);

        derivative = power * pow(sqrt(m), power - 1) * derivative + 1;


        //        float theta = 8.0*acos( w.y/r);
        //        float phi = 8.0*atan( w.x, w.z );
        p = point.xyz + pow(r, power) * vec3(sin(theta)*sin(phi), cos(theta), sin(theta)*cos(phi));

        // Scale and ratation
        //        float zr = pow(r, power);
        //        theta *= power;
        //        phi *= power;
        //
        //        // Back to normal coordinate system
        //        p = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        //        p += point.xyz;
        m = sqrLength(p);
        if (m > 256){
            break;
        }
    }
    float shape = 0.25 * log(m) * sqrt(m) / derivative;
    return shape * point.w;
}

float mandelBulb2(in vec4 point, out vec4 orbitTrap){
    vec3 p = point.xyz;
    float m = sqrLength(p.xyz);
    orbitTrap = vec4(abs(p.xyz), m);
    float derivative = 1.0;
    float power = 8;

    for (int i = 0; i < 4; i++){
        float m2 = m*m;
        float m4 = m2*m2;

        derivative = sqrt(m * m2 * m4) * power * derivative + 1;
        // Magic to remove trigonmetric functions. Only works on power 8.
        float x = p.x; float x2 = x * x; float x4 = x2 * x2;
        float y = p.y; float y2 = y * y; float y4 = y2 * y2;
        float z = p.z; float z2 = z * z; float z4 = z2 * z2;

        float k3 = x2 + z2;
        float k2 = inversesqrt(k3 * k3 * k3 * k3 * k3 * k3 * k3);
        float k1 = x4 + y4 + z4 - 6.0 * y2 * z2 - 6.0 * x2 * y2 + 2.0 * z2 * x2;
        float k4 = x2 - y2 + z2;

        p.x = point.x + 64.0 * x * y * z * (x2 - z2) * k4 * (x4 - 6.0 * x2 * z2 + z4) * k1 * k2;
        p.y = point.y + -16.0 * y2 * k3 * k4 * k4 + k1 * k1;
        p.z = point.z + -8.0 * y * k4 * (x4 * x4 - 28.0 * x4 * x2 * z2 + 70.0 * x4 * z4 - 28.0 * x2 * z2 * z4 + z4 * z4) * k1 * k2;
        // end magic.
        m = sqrLength(p.xyz);
        orbitTrap = min(orbitTrap, vec4(abs(p.xyz), m));
        if (m > 256)
        break;
    }
    float shape = 0.25 * log(m) * sqrt(m) / derivative;
    return shape * point.w;
}

float mandelBox(in vec4 point, in vec3 center, out vec4 orbitTrap){
    vec4 p = point;
    orbitTrap = vec4(abs(p.xyz), sqrLength(p.xyz));

    for (int i = 0; i < 16; i++){
        p = foldBox(p, vec3(1));
        p = foldSphere(p, 0.5, 1);
        p = scale(p, 0.5);
        p = translate(p, center);
        orbitTrap = min(orbitTrap, vec4(abs(p.xyz), sqrLength(p.xyz)) / p.w);
    }

    return sdBox(p, vec3(6));
}

vec3 colorRampRepeat(float interpolation){
    float globalInterpolation = mod(interpolation, 1.0) * colorIndex.length();
    int start = int(globalInterpolation);
    int end = (start + 1) % colorIndex.length();

    float localInterpolation = mod(globalInterpolation, 1);
    vec3 startColor = colorIndex[start];
    vec3 endColor = colorIndex[end];
    return (startColor + (endColor - startColor) * localInterpolation);
}

float sdCross(vec4 point){
    vec3 a = abs(point.xyz);
    float da = max(a.x, a.y);
    float db = max(a.z, a.y);
    float dc = max(a.x, a.z);
    float result = min(da, min(db, dc)) - 1;
    return result * point.w;
}

float distFunc(in vec3 point, out vec4 color){

    vec4 p = vec4(point, 1);
    vec3 fractalColor = defaultColor;
    color = vec4(fractalColor, reflectivity);
    vec4 orbitTrap;
    vec2 sinCos = vec2(sin(time*0.05), cos(time* 0.05));
    vec3 c = vec3(0);
    float cutoff = step(-3.5, point.y);

    float ground = sdPlane(p, vec3(0, 1, 0), 4);

    switch (scene){
        case 0:// Default fractal
        orbitTrap = vec4(abs(p.xyz), sqrLength(p.xyz));

        c = vec3(1, 1, 0.5);
        p = scale(p, 0.25);
        for (int i = 0; i < 16; i++){
            p = rotateY(p, sinCos);
            p = scale(p, 0.75);
            p = translate(p, c);
            p = rotateX(p, sinCos);
            p = foldAbs(p, -c);
            orbitTrap = min(orbitTrap, vec4((p.xyz), sqrLength(p.xyz)) / p.w);
        }

        // Calculate fractal color
        colorIndex[0] = vec3(1, 0, 0);
        colorIndex[1] = vec3(0, 1, 0);
        colorIndex[2] = vec3(0, 0, 1);

        fractalColor = vec3((1 - orbitTrap.y) * 0.01, pow(orbitTrap.w, 2), (1 - orbitTrap.x) * 0.015);

        fractalColor = cutoff * fractalColor + (1 - cutoff) * defaultColor;
        color = vec4(fractalColor, reflectivity);
        return min(ground, sdBox(p, vec3(1)));
        //-------------------------------------------------------------------------------------------------------------
        case 1:// Box with abs folding
        float torus = sdTorus(p, vec2(1, 0.5));
        p = scale(p, 0.5);
        c = vec3(1.5) + debug;
        p = translate(p, c);
        p = foldAbs(p, -c);
        fractalColor = vec3(0, 0.8, 0.2) * cutoff + defaultColor * (1-cutoff);
        color = vec4(fractalColor, reflectivity);
        return min(smoothMin(sdBox(p, vec3(0.5)), torus, 0.5), ground);
        //-------------------------------------------------------------------------------------------------------------
        case 2:// Mandelbox
        vec4 b = rotateY(p, sinCos);
        b = scale(b, 0.5);
        b = rotationAlign(b, vec3(0, 1, 0), vec3(0.58, 0.58, 0.58));
        c = vec3(4.5, 3.25, 3.35);
        float mandelBox = mandelBox(b, c, orbitTrap);
        cutoff = smoothstep(-3.85, -3.75, p.y);

        fractalColor = vec3(exp(-orbitTrap.x), orbitTrap.x * 0.5, orbitTrap.y);
        fractalColor = cutoff * fractalColor + (1 - cutoff) * defaultColor;
        color = vec4(fractalColor, reflectivity);
        return smoothMin(mandelBox, ground, 1);
        //-------------------------------------------------------------------------------------------------------------
        case 3:// Mandelbulb
        p = scale(p, 2);
        p = rotateY(p, sinCos);
        float mandelBulb = mandelBulb2(p, orbitTrap);
        vec3 innerColor = vec3(0.01);
        vec3 middleColor = vec3(0.1, 0.7, 0.1) * 1.75;
        fractalColor = pow(mix(innerColor, middleColor, pow(max(orbitTrap.w -0.1, 0), 3) / 2), vec3(1.5));
        vec3 redVein = vec3(0.7, 0, 0.3) * pow(1 - orbitTrap.y, 16);
        fractalColor += redVein;
        fractalColor = clamp(fractalColor, vec3(0), vec3(1));
        fractalColor = cutoff * fractalColor + (1.0 - cutoff) * defaultColor;
        color = vec4(fractalColor, reflectivity);
        return min(mandelBulb, ground);
        //-------------------------------------------------------------------------------------------------------------
        case 4:// Sierpinski tetrahedron
        p = scale(p, 2);
        p = rotateY(p, sinCos);
        orbitTrap = vec4(abs(p.xyz), sqrLength(p.xyz));
        for (int i = 0; i < 12 + int(debug.z); i++){
            p = foldSierpinski(p);
            p = scale(p, 0.5);
            p = translate(p, vec3(1));
            orbitTrap = min(orbitTrap, vec4(abs(p.xyz), sqrLength(p.xyz)));
        }
        fractalColor = vec3(orbitTrap.y * 0.25, orbitTrap.x * 2, orbitTrap.z * 8);
        fractalColor = clamp(fractalColor, vec3(0), vec3(1));
        fractalColor = fractalColor * cutoff + defaultColor * (1-cutoff);
        color = vec4(fractalColor, reflectivity);
        return min(ground, sdBox(p, vec3(1)));
        //-------------------------------------------------------------------------------------------------------------
        case 5:// Menger sponge
        //        float build = (sin(0.25 * time + 3.14) + 1) * 0.5;
        p = scale(p, 2);
        p = rotateY(p, sinCos);
        orbitTrap = vec4(abs(p.xyz), sqrLength(p.xyz));
        for (int i = 0; i < 6; i++){
            p = foldAbs(p, vec3(0));
            p = foldMenger(p);
            p = scale(p, 0.333333333);
            p = translate(p, vec3(2, 2, 0));
            p = foldPlane(p, vec3(0, 0, -1), -1);
            orbitTrap = min(orbitTrap, vec4(abs(p.xyz), sqrLength(p.xyz)));
        }
        fractalColor = vec3(mod(vec3(orbitTrap.z, orbitTrap.y, orbitTrap.x), 1)) * vec3(1, 1, 1);
        fractalColor = fractalColor * cutoff + defaultColor * (1 - cutoff);
        color = vec4(fractalColor, reflectivity);
        return min(ground, sdBox(p, vec3(2)));
        //-------------------------------------------------------------------------------------------------------------
        case 6:// Fractarium
        p = rotateY(p, sinCos);
        vec2 n90 = vec2(sin(pi / 2), cos(pi / 2));
        p = scale(p, 0.25);
        p = foldPlane(p, vec3(0, 0, 1), 3);
        //        p = foldSierpinski(p);
        orbitTrap = mod(vec4(abs(p.xyz), 0), 5);
        for (int i = 0; i < 8; i++){
            // vec3(-0.5, 2.5, -0.3333)
            p = foldBox(p, vec3(7, 5.5, -6.3333) + debug);

            p = foldMenger(p);
            p = translate(p, vec3(1, 0.5, 0));
            p = rotateX(p, n90);
            p = scale(p, 0.5);
            orbitTrap = min(orbitTrap, mod(vec4(abs(p.xyz), 0), 5));
        }

        fractalColor = orbitTrap.rbb * vec3(0.2, 1, 2);
        cutoff = smoothstep(-3.75, -3.5, point.y);
        fractalColor = fractalColor * cutoff + defaultColor * (1 - cutoff);
        color = vec4(fractalColor, reflectivity);
        return min(ground, sdBox(p, vec3(10 + debug2.x)));
        default :
        break;
    }
    return 100000;
}

float distFunc(in vec3 point){
    vec4 notUsed;
    return distFunc(point, notUsed);
}

vec3 getBackgroundColor(vec3 direction){
    float dirY = direction.y;
    return vec3(topColor * max(dirY + backgroundBlend, 0) + botColor * -min(dirY - backgroundBlend, 0) + pow(max(dot(sunDir, direction), 0), 24) * vec3(1, 0.9, 0.7));
}

// Works by arranging the sampling points in a tetrahedron
vec3 getNormal(in vec3 point, in float px){
    vec2 sign = vec2(1.0f, -1.0f) * 0.5773 * 0.25 * px;
    vec3 normal;

    normal = sign.xyy * distFunc(point + sign.xyy) +
    sign.yyx * distFunc(point + sign.yyx) +
    sign.yxy * distFunc(point + sign.yxy) +
    sign.xxx * distFunc(point + sign.xxx);


    return normalize(normal);
}

float getShadow(in vec3 point, in vec3 normal, in vec3 lightDir, float minDist, float maxDist, float sharpness, float distToCamera){
    float currentClosest = 1;
    float totalDist = minDist;
    vec3 start = point;
    for (int i = 0; i < 75; i++){
        float dist = distFunc(start + lightDir * totalDist);

        currentClosest = min(currentClosest, dist / (sharpness * totalDist));
        totalDist += max(dist, sharpness * 0.0002);
        if (currentClosest < -1 || totalDist > maxDist) break;
    }
    currentClosest = max(currentClosest, -1.0);
    return max(smoothstep(-1, 1, currentClosest), 0.5);
}

vec3 applyFog(in vec3 color, in vec3 origin, in vec3 rayDir, in vec3 lightDir, in float distanceToCamera){

    float test = 0.025;
    float falloffDelay = 1.05;

    vec3 absorbedFalloff = vec3(test);
    vec3 scatterFalloff = vec3(0.03);

    //    float originY = origin.y + debug.y;
    //    float dirY = rayDir.y + debug.y;
    //    float b = 0.5 + debug.z;
    //    float c = (0.01 + debug.x) / b;
    //    float fogAmount = c * exp(-originY * b) * (1 - exp(-distanceToCamera * dirY * b)) / dirY;
    //    fogAmount = clamp(fogAmount, 0, 1);

    vec3 absorbedColor = min(falloffDelay * exp(-distanceToCamera * absorbedFalloff), vec3(1));
    vec3 scatterColor = min(falloffDelay * exp(-distanceToCamera * scatterFalloff), vec3(1));// * (1-fogAmount);

    float sunAmount = max(dot(rayDir, lightDir), 0);

    absorbedColor = max(absorbedColor, 0.25);

    vec3 fogColor = mix(vec3(0.3, 0.4, 0.9), vec3(1, 0.9, 0.9), pow(sunAmount, 8));

    color = color * absorbedColor + fogColor * (1.0 - scatterColor);
    return color;
}

bool rayMarch(inout vec3 point, in vec3 direction, int iterations, float minDist, float maxDist, float px, out float totalDistance, out vec4 color){
    totalDistance = 0;
    vec3 origin = point;
    float closestDist = 10;
    for (int i = 0; i < iterations; i++){ // Raymarch
        float dist = distFunc(point, color);
        dist = max(dist, minDist);
        closestDist = min(closestDist, dist);
        totalDistance += dist;
        point = origin + direction * totalDistance;
        float threshold = 0.25 * px * totalDistance;

        if (dist < threshold + minDist){
            break;
        }
        if (totalDistance > maxDist){
            totalDistance = maxDist;
            color.xyz = defaultColor;
            break;
        }
    }
    color.rgb = clamp(color.rgb, vec3(0), vec3(1));
    return closestDist < totalDistance && totalDistance < maxDist;
}

float getAmbientOcclusion(in vec3 point, in vec3 normal){
    float ambientOcclusion = 0;
    float aoScale = 0.1f;
    int aoSamples = 5;
    float aoStrength = 5;
    for (int j = 1; j <= aoSamples; j++){
        float trueDist = aoScale * j;
        ambientOcclusion += (trueDist - distFunc(point + normal * trueDist)) / pow(2, j);// Outer samples have less influence on AO
    }
    ambientOcclusion = 1 - aoStrength * ambientOcclusion;
    return ambientOcclusion;
}

vec3 applyLighting(in vec3 baseColor, in vec3 normal, in vec3 reflection, float ambientOcclusion, float shadow){


    //    float shadow = getShadow(point, normal, sunDir, 0.05f, 100, 0.01, totalDist);
    //    shadow = max(shadow, 0.5);

    float sunLighting = max(dot(sunDir, normal), 0);
    float skyLighting = max(0.5 + 0.5 * normal.y, 0);
    float indirectLighting = max(dot(normalize(sunDir * vec3(-1, 0, -1)), normal), 0);
    vec3 lighting = sunLighting * sunColor * shadow;

    lighting += skyLighting * skyColor * ambientOcclusion;
    lighting += indirectLighting * sunColor * 0.3f * ambientOcclusion;

    //    vec3 halfVector = normalize(sunDir - direction);
    //    vec3 specular = pow(max(dot(normal, halfVector), 0), shininess) * vec3(0.1) * sunLighting * pow(shadow, 4);
    vec3 specular = pow(max(dot(sunDir, reflection), 0), shininess) * vec3(0.1) * sunLighting * pow(shadow, 4);

    baseColor = baseColor * 0.2 * lighting;
    baseColor += specular;

    return baseColor;
}

vec4 getReflection(vec3 point, vec3 normal, vec3 reflection, int iterations, float minDist, float maxDist, float px){

    int depth = -1;
    for (depth; depth + 1 < reflectionBounces;)
    {
        depth++;
        vec3 origin = point;
        float totalDistance;
        vec4 color;
        if (rayMarch(point, reflection, iterations, minDist, maxDist, px, totalDistance, color)){

            normal = getNormal(point, px);
            reflection = reflect(reflection, normal);

            float ao = getAmbientOcclusion(point, normal);
            float shadow = getShadow(point, normal, sunDir, 0.05f, 100, 0.01, totalDistance);
            color.rgb = applyLighting(color.rgb, normal, reflection, ao, shadow);
            reflectionColors[depth] = color;
        }
        else {
            reflectionColors[depth] = vec4(getBackgroundColor(reflection), 0);
            break;
        }
    }

    vec4 finalColor = reflectionColors[depth];
    for (int i = depth - 1; i >= 0; i--){
        vec4 other = reflectionColors[i];
        finalColor.rgb = finalColor.rgb * other.w + other.rgb * (1 - other.w);
    }
    return finalColor;
}

void main() {

    vec4 pixel = vec4(0, 0, 0, 1.0);
    vec2 pixelCoords = gl_FragCoord.xy;

    float fle = 1.0;

    float px = 2/(minAspect * fle);

    vec3 origin = cameraPosition;
    vec3 direction;

    float totalDist = 0;

    reflectivity = clamp(0.5 + debug2.z * 0.1, 0, 1);

    for (int ay = 0; ay < samplingAA; ay++)
    {
        for (int ax = 0; ax < samplingAA; ax++)
        {

            direction = (lowerLeft + pixelCoords.x * deltaU + (-deltaU * 0.5 + deltaU * ax / samplingAA) + pixelCoords.y * deltaV + (-deltaV * 0.5 + deltaV * ay / samplingAA)) - cameraPosition;
            direction = normalize(direction);

            float dirY = direction.y;

            globalScale = 1 + debug.y;

            vec3 point = origin;
            vec4 fractalColor;
            int iterations = 100;
            totalDist = 0;

            if (rayMarch(point, direction, 100, 0, 128 + int(debug.y), px, totalDist, fractalColor))
            {
                vec3 normal = getNormal(point, px);
                float ambientOcclusion = getAmbientOcclusion(point, normal);
                float shadow = getShadow(point, normal, sunDir, 0.05f, 100, 0.01, totalDist);

                vec3 reflection = reflect(direction, normal);


                if (reflectionBounces > 0){ // Apply reflection
                    vec4 reflectedColor = getReflection(point, normal, reflection, 100, 0, 16, px);
                    fractalColor.rgb = fractalColor.rgb * (1 - fractalColor.w) + reflectedColor.rgb * fractalColor.w;
                }
                //                fractalColor = mix(fractalColor, vec3(1), smoothstep(16, 32, totalDist));
                fractalColor.rgb = applyLighting(fractalColor.rgb, normal, reflection, ambientOcclusion, shadow);
                pixel.rgb += fractalColor.rgb;
            }
            else {
                pixel.rgb += getBackgroundColor(direction);
            }


        }
    }
    pixel /= samplingAA * samplingAA;
    pixel.rgb = applyFog(pixel.rgb, origin, direction, sunDir, totalDist);
    pixel.rgb = pow(pixel.xyz, vec3(1.0/2.2));// Gamma correction
    pixel.rgb += dither(textureCoordinates);

    color = pixel;

}


