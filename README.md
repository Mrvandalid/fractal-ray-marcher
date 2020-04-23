# Fractal ray marcher
An openGL implementation of a raymarching engine which visualize some 3D fractals.

You can watch a demo video of the project here:

[![Ray marcher demo video](http://img.youtube.com/vi/Et8JcAHHsOY/0.jpg)](http://www.youtube.com/watch?v=Et8JcAHHsOY "Fractal ray marcher demo")

## Controls
**Mouse:** rotate the camera on the xy axes.

**Z-X:** rotate the camera on the z axis (note: has gimbal lock).

**W-A-S-D:** move camera in the xz plane.

**E-Q:** move camera in the y direction.

**TAB:** switch scene.

**Left-shift:** modifier – multiplies your action by 5.

**Left-ctrl:** modifier – multiplies your action by 0.125

**P:** pause the rendering. Nice for screenshots.

**I-K-J-L-U-O:** increase/decrease debug numbers, three in total. Try them out! 

**T-G:** increase/decrease reflectivity.

**0-1-2-3-4:** set maximum reflection bounces.

**Scroll wheel:** Change turntable speed. (need to scroll a lot) 

**Esc:** close application.

You can set Anti-aliasing in the shader but is extremely expensive.


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
