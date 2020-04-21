#include <glad/glad.h>
#include <program.hpp>
#include "glutils.h"
#include <vector>
#include <iostream>
#include <fmt/format.h>

void generateTangents(Mesh &mesh, std::vector<glm::vec3> &tangents, std::vector<glm::vec3> &biTangents) {

	tangents.resize(mesh.vertices.size());
	biTangents.resize(mesh.vertices.size());

	for (unsigned long long i = 0; i < mesh.vertices.size(); i += 3) {

		int index1 = mesh.indices.at(i);
		int index2 = mesh.indices.at(i + 1);
		int index3 = mesh.indices.at(i + 2);

		glm::vec3 &v0 = mesh.vertices.at(index1);
		glm::vec3 &v1 = mesh.vertices.at(index2);
		glm::vec3 &v2 = mesh.vertices.at(index3);

		glm::vec2 &uv0 = mesh.textureCoordinates.at(index1);
		glm::vec2 &uv1 = mesh.textureCoordinates.at(index2);
		glm::vec2 &uv2 = mesh.textureCoordinates.at(index3);

		glm::vec3 deltaPos1 = v1 - v0;
		glm::vec3 deltaPos2 = v2 - v0;

		glm::vec2 deltaUV1 = uv1 - uv0;
		glm::vec2 deltaUV2 = uv2 - uv0;

		float r = 1.0f / ((deltaUV1.x * deltaUV2.y - deltaUV1.y - deltaUV2.x) + 0.00000000000000001f); // Needed to avoid invalid divisions.
//		if(i == 0)
//			std::cout << fmt::format("r; {}",r)<< std::endl;

		glm::vec3 tangent = (deltaPos1 * deltaUV2.y - deltaPos2 * deltaUV1.y) * r;
		glm::vec3 biTangent = (deltaPos2 * deltaUV1.x - deltaPos1 * deltaUV2.x) * r;

//		tangents.push_back(tangent);
//		tangents.push_back(tangent);
//		tangents.push_back(tangent);
//
//		biTangents.push_back(biTangent);
//		biTangents.push_back(biTangent);
//		biTangents.push_back(biTangent);

		tangents.at(index1) = tangent;
		tangents.at(index2) = tangent;
		tangents.at(index3) = tangent;

		biTangents.at(index1) = biTangent;
		biTangents.at(index2) = biTangent;
		biTangents.at(index3) = biTangent;
	}
	auto first = tangents.at(0);
	auto last = tangents.at(tangents.size() - 1);
//	std::cout << fmt::format("firts tangent: {} {} {} vs last tangent: {} {} {}", first.x, first.y, first.z, last.x,
//	                         last.y, last.z)
//	          << std::endl;
}

template<class T>
unsigned int generateAttribute(int id, int elementsPerEntry, std::vector<T> data, bool normalize) {
	unsigned int bufferID;
	glGenBuffers(1, &bufferID);
	glBindBuffer(GL_ARRAY_BUFFER, bufferID);
	glBufferData(GL_ARRAY_BUFFER, data.size() * sizeof(T), data.data(), GL_STATIC_DRAW);
	glVertexAttribPointer(id, elementsPerEntry, GL_FLOAT, normalize ? GL_TRUE : GL_FALSE, sizeof(T), 0);
	glEnableVertexAttribArray(id);
	return bufferID;
}

unsigned int generateBuffer(Mesh &mesh, unsigned int &textureCoordID) {
	unsigned int vaoID;
	glGenVertexArrays(1, &vaoID);
	glBindVertexArray(vaoID);


	generateAttribute(0, 3, mesh.vertices, false);
	generateAttribute(1, 3, mesh.normals, true);
	if (mesh.textureCoordinates.size() > 0) {
		textureCoordID = generateAttribute(2, 2, mesh.textureCoordinates, false);
//		if (mesh.vertices.size() == mesh.indices.size()) {
//
//			auto tangents = std::vector<glm::vec3>();
//			auto biTangents = std::vector<glm::vec3>();
//
//			generateTangents(mesh, tangents, biTangents);
//			generateAttribute(3, 3, tangents, true);
//			generateAttribute(4, 3, biTangents, true);
//		}
	}

	unsigned int indexBufferID;
	glGenBuffers(1, &indexBufferID);
	glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, indexBufferID);
	glBufferData(GL_ELEMENT_ARRAY_BUFFER, mesh.indices.size() * sizeof(unsigned int), mesh.indices.data(),
	             GL_STATIC_DRAW);

	return vaoID;
}

unsigned int generateBuffer(Mesh &mesh) {
	unsigned int a;
	return generateBuffer(mesh, a);
}

