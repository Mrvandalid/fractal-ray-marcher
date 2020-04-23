# fractal-ray-marcher
An openGL implementation of a raymarching engine which visualize some 3D fractals.

# gloom


A minimalistic boilerplate for OpenGL with C++ derived from _Glitter_. Its intended use is to get smaller OpenGL projects quickly up and running for the graphics courses at _NTNU_.


## Dependencies

* _CMake_ (v.3.*) is used to generate platform-specific makefiles and workspaces.

Please refer to the individual library repositories for more information about additional dependencies.


# Getting started

## Download


The project and all third-party libraries can be downloaded by cloning this repository with the ``--recursive`` flag.

```bash

  git clone --recursive https://github.com/senbon/gloom.git
```
If you have already cloned the repository and missed the ``--recursive`` flag, then the following grabs all dependencies.

```bash

  git submodule update --init
```

## Compilation


### Linux (command-line)

With all dependencies installed, compiling the project is as easy as running CMake followed by the ``make`` command.

```bash

  # Change into the directory where you want your makefiles
  cd ./gloom/build

  # Generate UNIX Makefile (point CMake to CMakeLists.txt)
  cmake ..

  # Execute make command
  make

  # Run executable
  ./gloom/gloom
```
Specific generators can also be specified with CMake if you want to create workspaces for an IDE, for example:

```bash

  cmake -G "CodeBlocks - Unix Makefiles"
```

### Windows (cmake-gui)


1. Set the source code file to the root directory containing ``CMakeLists.txt``
2. Binaries can be built in the directory of your choice, e.g. ``gloom\build\``
3. Click the configure button and select which generator you would like to use
4. Click the generate button
5. If your generator is an IDE such as Visual Studio, then open up the newly created .sln file and build ``ALL_BUILD``. After this you might want to set ``gloom`` as you StartUp Project.

## Documentation


The full documentation can be found on the _repository wiki_.
Among other things, the wiki includes information on how to use the shader and camera class bundled with gloom.


Links

Glitter: https://github.com/Polytonic/Glitter

NTNU: https://www.ntnu.edu/

glad: https://github.com/Dav1dde/glad

glfw: https://github.com/glfw/glfw

glm: https://github.com/g-truc/glm

stb: https://github.com/nothings/stb

CMake: https://cmake.org/

repository wiki: https://github.com/senbon/gloom/wiki
