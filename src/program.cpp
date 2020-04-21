// Local headers
#include "program.hpp"
#include "utilities/window.hpp"
#include "gamelogic.h"
#include <glm/glm.hpp>
// glm::translate, glm::rotate, glm::scale, glm::perspective
#include <glm/gtc/matrix_transform.hpp>
#include <iostream>
#include <SFML/Audio.hpp>
#include <SFML/System/Time.hpp>
#include <utilities/shapes.h>
#include <utilities/glutils.h>
#include <utilities/shader.hpp>
#include <glm/gtc/type_ptr.hpp>
#include <utilities/timeutils.h>


void runProgram(GLFWwindow* window, CommandLineOptions options) {
	// Enable depth (Z) buffer (accept "closest" fragment)
	glEnable(GL_DEPTH_TEST);
	glDepthFunc(GL_LESS);

	// Configure miscellaneous OpenGL settings
	glEnable(GL_CULL_FACE);

	// Disable built-in dithering
	glDisable(GL_DITHER);

	// Enable transparency
	glEnable(GL_BLEND);
	glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);

	// Set default colour after clearing the colour buffer
	glClearColor(0.3f, 0.5f, 0.8f, 1.0f);

	initGame(window, options);

	bool pause = false;
	bool pressedPause = false;

	// Rendering Loop
	while (!glfwWindowShouldClose(window)) {

		if (glfwGetKey(window, GLFW_KEY_P)) {
			if (!pressedPause) {
				pause = !pause;
			}
			pressedPause = true;
		} else {
			pressedPause = false;
		}



		if (!pause) {
			// Clear colour and depth buffers
			glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
//		runCompute();

			updateFrame(window);

			renderFrame(window);

			// Flip buffers
			glfwSwapBuffers(window);
		}
		// Handle other events
		glfwPollEvents();
		handleKeyboardInput(window);
		printGLError();
	}
}


void handleKeyboardInput(GLFWwindow* window) {
	// Use escape key for terminating the GLFW window
	if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS) {
		glfwSetWindowShouldClose(window, GL_TRUE);
	}
}
