#include <iostream>
#include "glfont.h"

Mesh generateTextGeometryBuffer(std::string &text, float characterHeightOverWidth, float totalTextWidth) {
	float characterWidth = totalTextWidth / float(text.length());
	float characterHeight = characterHeightOverWidth * characterWidth;

	float characterUVWidth = 1/128.0f;

	unsigned int vertexCount = 4 * text.length();
	unsigned int indexCount = 6 * text.length();

	Mesh mesh;

	mesh.vertices.resize(vertexCount);
	mesh.normals.resize(vertexCount);
	mesh.indices.resize(indexCount);
	mesh.textureCoordinates.resize(vertexCount);

	for (unsigned int i = 0; i < text.length(); i++) {
		float baseXCoordinate = float(i) * characterWidth;

		float baseCharCoordinate = float(text[i]) * characterUVWidth;

		mesh.vertices.at(4 * i + 0) = {baseXCoordinate, 0, 0};
		mesh.vertices.at(4 * i + 1) = {baseXCoordinate + characterWidth, 0, 0};
		mesh.vertices.at(4 * i + 2) = {baseXCoordinate + characterWidth, characterHeight, 0};

		mesh.vertices.at(4 * i + 0) = {baseXCoordinate, 0, 0};
		mesh.vertices.at(4 * i + 2) = {baseXCoordinate + characterWidth, characterHeight, 0};
		mesh.vertices.at(4 * i + 3) = {baseXCoordinate, characterHeight, 0};

		mesh.textureCoordinates.at(4 * i + 0) = {baseCharCoordinate, 0};
		mesh.textureCoordinates.at(4 * i + 1) = {baseCharCoordinate + characterUVWidth, 0};
		mesh.textureCoordinates.at(4 * i + 2) = {baseCharCoordinate + characterUVWidth, 1};

		mesh.textureCoordinates.at(4 * i + 0) = {baseCharCoordinate, 0};
		mesh.textureCoordinates.at(4 * i + 2) = {baseCharCoordinate + characterUVWidth, 1};
		mesh.textureCoordinates.at(4 * i + 3) = {baseCharCoordinate, 1};

//		mesh.normals.at(4 * i + 0) = {0, 0, 1};
//		mesh.normals.at(4 * i + 1) = {0, 0, 1};
//		mesh.normals.at(4 * i + 2) = {0, 0, 1};
//		mesh.normals.at(4 * i + 3) = {0, 0, 1};

		mesh.indices.at(6 * i + 0) = 4 * i + 0;
		mesh.indices.at(6 * i + 1) = 4 * i + 1;
		mesh.indices.at(6 * i + 2) = 4 * i + 2;
		mesh.indices.at(6 * i + 3) = 4 * i + 0;
		mesh.indices.at(6 * i + 4) = 4 * i + 2;
		mesh.indices.at(6 * i + 5) = 4 * i + 3;
	}

	return mesh;
}