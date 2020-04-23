#include <chrono>
#include <GLFW/glfw3.h>
#include <glad/glad.h>
#include <SFML/Audio/SoundBuffer.hpp>
#include <utilities/shader.hpp>
#include <glm/vec3.hpp>
#include <iostream>
#include <utilities/timeutils.h>
#include <utilities/mesh.h>
#include <utilities/shapes.h>
#include <utilities/glutils.h>
#include <SFML/Audio/Sound.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>
#include <fmt/format.h>
#include "gamelogic.h"
#include "sceneGraph.hpp"

#define GLM_ENABLE_EXPERIMENTAL
#define M_PHI 1.618033988f

#include <glm/gtx/transform.hpp>

#include "utilities/imageLoader.hpp"
#include "utilities/glfont.h"

enum KeyFrameAction {
	BOTTOM, TOP
};

#include <timestamps.h>

//double padPositionX = 0;
//double padPositionZ = 0;
//
//unsigned int currentKeyFrame = 0;
//unsigned int previousKeyFrame = 0;

//unsigned int score = 0;
//std::string scoreText = "Score:0   ";

SceneNode* rootNode;
SceneNode* renderQuadNode;
SceneNode* cameraNode;

//SceneNode* lights[3];

// These are heap allocated, because they should not be initialised at the start of the program
sf::SoundBuffer* buffer;
Gloom::Shader* quadShader;
Gloom::Shader* rayShader;
sf::Sound* sound;

GLuint outputTexture;

glm::vec3 cameraDir = glm::vec3(0);
glm::vec3 targetCameraRotation = glm::vec3(0);
glm::vec3 targetCameraPosition = glm::vec3(0);

float fov = 90.f;
glm::vec3 debug;
glm::vec3 debug2;
int reflectionBounces = 0;
//float debug.z = 0;
//float debug.x = 0;
//float debug.y = 0;

int scene = 0;
bool pressedSwitchScene = false;

bool pressedDebugButtonLastFrame = false;
//const glm::vec3 boxDimensions(180, 90, 90);
//const glm::vec3 padDimensions(30, 3, 40);

//glm::vec3 ballPosition(0, ballRadius + padDimensions.y, boxDimensions.z / 2);
//glm::vec3 ballDirection(1, 1, 0.2f);
//
//glm::vec3 lightPositions(0, -30, -90);
//float lightSpread = 0;

CommandLineOptions options;
auto workGroupSize = glm::uvec3(windowWidth, windowHeight, 1);

bool test = true;

//// Modify if you want the music to start further on in the track. Measured in seconds.
//const float debug_startTime = 0;
//double totalElapsedTime = debug_startTime;
//double gameElapsedTime = debug_startTime;
//
double mouseSensitivity = 0.5f;
double lastMouseX = float(windowWidth) / 2;
double lastMouseY = float(windowHeight) / 2;

float timer = 0;
float scroll;

glm::vec3 lerp(glm::vec3 from, glm::vec3 to, float amount) {
	return from + (to - from) * glm::clamp(amount, 0.f, 1.f);
}

void mouseScrollCallback(GLFWwindow* window, double xOffset, double yOffset) {
	scroll += yOffset;
}

//// A few lines to help you if you've never used c++ structs
//struct LightSource {
//	LightSource() {
//		color = glm::vec4(1);
//	}
//
//	glm::vec4 color;
//};
//LightSource lightSources[3];


Mesh generateQuad(int width, int height) {
	Mesh mesh = Mesh();
	mesh.vertices.emplace_back(0, 0, 0);
	mesh.vertices.emplace_back(width, 0, 0);
	mesh.vertices.emplace_back(width, height, 0);
	mesh.vertices.emplace_back(0, height, 0);

	mesh.normals.emplace_back(0, 0, -1);
	mesh.normals.emplace_back(0, 0, -1);
	mesh.normals.emplace_back(0, 0, -1);
	mesh.normals.emplace_back(0, 0, -1);

	mesh.textureCoordinates.emplace_back(0, 0);
	mesh.textureCoordinates.emplace_back(1, 0);
	mesh.textureCoordinates.emplace_back(1, 1);
	mesh.textureCoordinates.emplace_back(0, 1);

	mesh.indices.emplace_back(0);
	mesh.indices.emplace_back(1);
	mesh.indices.emplace_back(2);
	mesh.indices.emplace_back(0);
	mesh.indices.emplace_back(2);
	mesh.indices.emplace_back(3);

	return mesh;
}

void handleKeyboard(GLFWwindow* window, float deltaTime) {
	float translationSpeed = 0.5;
	float rotationSpeed = 2;

	float multiplier = 1;

	if (glfwGetKey(window, GLFW_KEY_LEFT_SHIFT)) {
		multiplier *= 8;
	}
	if (glfwGetKey(window, GLFW_KEY_LEFT_CONTROL)) {
		multiplier *= 0.125;
	}

	if (glfwGetKey(window, GLFW_KEY_W)) {
		cameraDir += glm::vec3(0, 0, 1) * deltaTime * translationSpeed * multiplier;
	}
	if (glfwGetKey(window, GLFW_KEY_S)) {
		cameraDir += glm::vec3(0, 0, -1) * deltaTime * translationSpeed * multiplier;
	}
	if (glfwGetKey(window, GLFW_KEY_A)) {
		cameraDir += glm::vec3(-1, 0, 0) * deltaTime * translationSpeed * multiplier;
	}
	if (glfwGetKey(window, GLFW_KEY_D)) {
		cameraDir += glm::vec3(1, 0, 0) * deltaTime * translationSpeed * multiplier;
	}
	if (glfwGetKey(window, GLFW_KEY_E)) {
		cameraDir += glm::vec3(0, 1, 0) * deltaTime * translationSpeed * multiplier;
	}
	if (glfwGetKey(window, GLFW_KEY_Q)) {
		cameraDir += glm::vec3(0, -1, 0) * deltaTime * translationSpeed * multiplier;
	}

	bool pressedDebugButton = false;

	if (glfwGetKey(window, GLFW_KEY_Z)) {
		targetCameraRotation.z += deltaTime * rotationSpeed * multiplier;
	}
	if (glfwGetKey(window, GLFW_KEY_C)) {
		targetCameraRotation.z -= deltaTime * rotationSpeed * multiplier;
	}

	if (glfwGetKey(window, GLFW_KEY_I)) {
		debug.z += deltaTime * rotationSpeed * multiplier;
		pressedDebugButton = true;
	}
	if (glfwGetKey(window, GLFW_KEY_K)) {
		debug.z -= deltaTime * rotationSpeed * multiplier;
		pressedDebugButton = true;
	}
	if (glfwGetKey(window, GLFW_KEY_L)) {
		debug.x += deltaTime * rotationSpeed * multiplier;
		pressedDebugButton = true;
	}
	if (glfwGetKey(window, GLFW_KEY_J)) {
		debug.x -= deltaTime * rotationSpeed * multiplier;
		pressedDebugButton = true;
	}
	if (glfwGetKey(window, GLFW_KEY_U)) {
		debug.y += deltaTime * rotationSpeed * multiplier;
		pressedDebugButton = true;
	}
	if (glfwGetKey(window, GLFW_KEY_O)) {
		debug.y -= deltaTime * rotationSpeed * multiplier;
		pressedDebugButton = true;
	}

	if (glfwGetKey(window, GLFW_KEY_T)) {
		debug2.z += deltaTime * rotationSpeed * multiplier;
		pressedDebugButton = true;
	}
	if (glfwGetKey(window, GLFW_KEY_G)) {
		debug2.z -= deltaTime * rotationSpeed * multiplier;
		pressedDebugButton = true;
	}
	if (glfwGetKey(window, GLFW_KEY_H)) {
		debug2.x += deltaTime * rotationSpeed * multiplier;
		pressedDebugButton = true;
	}
	if (glfwGetKey(window, GLFW_KEY_F)) {
		debug2.x -= deltaTime * rotationSpeed * multiplier;
		pressedDebugButton = true;
	}
	if (glfwGetKey(window, GLFW_KEY_R)) {
		debug2.y += deltaTime * rotationSpeed * multiplier;
		pressedDebugButton = true;
	}
	if (glfwGetKey(window, GLFW_KEY_Y)) {
		debug2.y -= deltaTime * rotationSpeed * multiplier;
		pressedDebugButton = true;
	}

	if (pressedDebugButtonLastFrame && !pressedDebugButton) {
		std::cout << fmt::format("debug.x: {},  debug.y: {}, debug.z: {} |-| debug2.x: {},  debug2.y: {}, debug2.z: {}",
		                         debug.x, debug.y, debug.z, debug2.x, debug2.y, debug2.z) << std::endl;
	}
	pressedDebugButtonLastFrame = pressedDebugButton;

	if (glfwGetKey(window, GLFW_KEY_UP)) {
		fov -= deltaTime * 15;
	}
	if (glfwGetKey(window, GLFW_KEY_DOWN)) {
		fov += deltaTime * 15;
	}

	if (glfwGetKey(window, GLFW_KEY_0)) {
		reflectionBounces = 0;
	}
	if (glfwGetKey(window, GLFW_KEY_1)) {
		reflectionBounces = 1;
	}
	if (glfwGetKey(window, GLFW_KEY_2)) {
		reflectionBounces = 2;
	}
	if (glfwGetKey(window, GLFW_KEY_3)) {
		reflectionBounces = 3;
	}
	if (glfwGetKey(window, GLFW_KEY_4)) {
		reflectionBounces = 4;
	}


	if (glfwGetKey(window, GLFW_KEY_TAB)) {
		if (!pressedSwitchScene) {
			scene = (scene + 1) % 7;
			debug = glm::vec3(0);
			debug2 = glm::vec3(0);
			timer = 0;
		}
		pressedSwitchScene = true;
	} else {
		pressedSwitchScene = false;
	}


}

void initGame(GLFWwindow* window, CommandLineOptions gameOptions) {
	//// This is disabled because it caused an 8~ second startup freeze om my machine, which made debugging a chore.
//	buffer = new sf::SoundBuffer();
//	if (!buffer->loadFromFile("../res/Hall of the Mountain King.ogg")) {
//		return;
//	}


	options = gameOptions;
	glfwSetInputMode(window, GLFW_CURSOR, GLFW_CURSOR_HIDDEN);
//	glfwSetCursorPosCallback(window, mouseCallback);
	glfwSetScrollCallback(window, mouseScrollCallback);

	// Setup render-texture for compute shader.
//	glGenTextures(1, &outputTexture);
//	glActiveTexture(GL_TEXTURE0);
//	glBindTexture(GL_TEXTURE_2D, outputTexture);
//	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
//	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
//	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
//	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
//	glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA32F, windowWidth, windowHeight, 0, GL_RGBA, GL_FLOAT, nullptr);
//	glBindImageTexture(0, outputTexture, 0, GL_FALSE, 0, GL_READ_WRITE, GL_RGBA32F);

	quadShader = new Gloom::Shader();
//	rayShader = new Gloom::Shader();
//	rayShader->attach("../res/shaders/rayMarcher.comp");
//	rayShader->link();
	quadShader->makeBasicShader("../res/shaders/simple.vert", "../res/shaders/rayMarcher.frag");
	quadShader->activate();



	// Construct scene
	rootNode = createSceneNode();
	renderQuadNode = createSceneNode();
	cameraNode = createSceneNode();

	cameraNode->position.z = -5;
	targetCameraPosition = cameraNode->position;
//	testNode = createSceneNode();



	Mesh renderQuadMesh = generateQuad(windowWidth, windowHeight);
	unsigned int renderQuadVAO = generateBuffer(renderQuadMesh);
	renderQuadNode->vertexArrayObjectID = (int) renderQuadVAO;
	renderQuadNode->VAOIndexCount = renderQuadMesh.indices.size();

	rootNode->children.push_back(renderQuadNode);
	rootNode->children.push_back(cameraNode);

	std::cout << fmt::format("Initialized scene with {} SceneNodes.", totalChildren(rootNode)) << std::endl;
	getTimeDeltaSeconds();
//	int maxWorkGroupX;
//	int maxWorkGroupY;
//	int maxWorkGroupZ;
//	glGetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_COUNT, 0, &maxWorkGroupX);
//	glGetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_COUNT, 1, &maxWorkGroupY);
//	glGetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_COUNT, 2, &maxWorkGroupZ);
//	std::cout << fmt::format("Max compute work group count x: {}, y: {}, z:{}", maxWorkGroupX, maxWorkGroupY, maxWorkGroupZ) << std::endl;
}

void setupCameraUniforms() {

	glUniform3f(10, debug.x, debug.y, debug.z);
	glUniform3f(11, debug2.x, debug2.y, debug2.z);
	glUniform3i(12, glm::min(windowHeight, windowWidth), scene, reflectionBounces);

	glm::vec3 camPos = cameraNode->currentTransformationMatrix[3];
	glUniform3fv(5, 1, glm::value_ptr(camPos));
	glm::mat3 rot = glm::transpose(glm::inverse(glm::mat3(cameraNode->currentTransformationMatrix)));

	glm::vec3 right = rot * glm::vec3(1, 0, 0);
	glm::vec3 up = rot * glm::vec3(0, 1, 0);
	glm::vec3 forward = rot * glm::vec3(0, 0, 1);

	float a = float(windowWidth) / windowHeight;
	float focalDistance = 1.0f;
	float wv = focalDistance * glm::tan(glm::radians(fov / 2));
	float hv = wv / a;
	glm::vec3 lowerLeft = camPos + focalDistance * forward - wv * right - hv * up;
	glm::vec3 deltaU = ((2.f * wv) / windowWidth) * right;
	glm::vec3 deltaV = ((2.f * hv) / windowHeight) * up;


	glUniform3fv(6, 1, glm::value_ptr(lowerLeft));
	glUniform3fv(7, 1, glm::value_ptr(deltaU));
	glUniform3fv(8, 1, glm::value_ptr(deltaV));

	glUniform1f(9, timer);

//	std::cout << fmt::format("Cam pos: {} {} {}", camPos.x, camPos.y, camPos.z) << std::endl;

}

void runCompute() {
	rayShader->activate();

	setupCameraUniforms();

	glDispatchCompute(workGroupSize.x, workGroupSize.y, workGroupSize.z);
}

void updateFrame(GLFWwindow* window) {

//	quadShader->activate();

//	glfwSetInputMode(window, GLFW_CURSOR, GLFW_CURSOR_DISABLED);

	auto deltaTime = (float) getTimeDeltaSeconds();
	timer += deltaTime * (1 + scroll * 0.01f);


	targetCameraPosition += glm::transpose(glm::inverse(glm::mat3(cameraNode->currentTransformationMatrix))) * cameraDir;
//	glm::vec3 cameraNode->position = glm::vec3(0, 2, -20);
	cameraNode->position = lerp(cameraNode->position, targetCameraPosition, deltaTime * 2);
	cameraDir = glm::vec3(0);

	handleKeyboard(window, deltaTime);

	double mouseX, mouseY;
	glfwGetCursorPos(window, &mouseX, &mouseY);

	double deltaX = mouseX - lastMouseX;
	double deltaY = mouseY - lastMouseY;

	float cos = glm::cos(cameraNode->rotation.z);
	float sin = glm::sin(cameraNode->rotation.z);

	float rotX = mouseSensitivity * deltaY / windowHeight;
	float rotY = mouseSensitivity * deltaX / windowHeight;

	targetCameraRotation.x += rotX * cos + rotY * -sin;
	targetCameraRotation.y += rotY * cos + rotX * sin;

//	targetCameraRotation.x += mouseSensitivity * deltaY / windowHeight;
//	targetCameraRotation.y += mouseSensitivity * deltaX / windowHeight;
	cameraNode->rotation = lerp(cameraNode->rotation, targetCameraRotation, deltaTime * 2);

	glfwSetCursorPos(window, float(windowWidth) / 2, float(windowHeight) / 2);


	updateNodeTransformations(rootNode, glm::mat4(1));

}

void updateNodeTransformations(SceneNode* node, glm::mat4 transformationThusFar) {
	glm::mat4 transformationMatrix =
			glm::translate(node->position)
			* glm::translate(node->referencePoint)
			* glm::rotate(node->rotation.y, glm::vec3(0, 1, 0))
			* glm::rotate(node->rotation.x, glm::vec3(1, 0, 0))
			* glm::rotate(node->rotation.z, glm::vec3(0, 0, 1))
			* glm::scale(node->scale)
			* glm::translate(-node->referencePoint);

	node->currentTransformationMatrix = transformationThusFar * transformationMatrix;


	for (SceneNode* child : node->children) {
		updateNodeTransformations(child, node->currentTransformationMatrix);
	}
}

void renderNode(SceneNode* node) {

	glm::mat4 projection = glm::ortho(0.f, float(windowWidth), 0.f, float(windowHeight));
	glUniformMatrix4fv(15, 1, GL_FALSE, glm::value_ptr(projection * node->currentTransformationMatrix));

	if (node->vertexArrayObjectID != -1) {
		if (test) {
			std::cout << fmt::format("Draws quad with {} indices.", node->VAOIndexCount) << std::endl;
			test = false;
		}
		glBindVertexArray(node->vertexArrayObjectID);
		glDrawElements(GL_TRIANGLES, node->VAOIndexCount, GL_UNSIGNED_INT, nullptr);
	}

	for (SceneNode* child : node->children) {
		renderNode(child);
	}
}

void renderFrame(GLFWwindow* window) {
	int windowWidth, windowHeight;
	glfwGetWindowSize(window, &windowWidth, &windowHeight);
	glViewport(0, 0, windowWidth, windowHeight);

	setupCameraUniforms();

//	glBindTextureUnit(0, outputTexture);
	renderNode(rootNode);

//	test = false;
}
