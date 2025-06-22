# Chat with Ollama and Spring Boot AI

#### First steps:

Download
1. https://ollama.com/download

Choose model
2. https://ollama.com/search

#### Pull model and run in console (e.g. deepseek-r1:14b)
1. ollama pull deepseek-r1:14b
2. ollama run deepseek-r1:14b
3. Change model if needed in [application.yaml](src/main/resources/application.yaml)
4. Delete model ollama rm deepseek-r1:14b

#### Also model can be available in the Docker (It is better not to use in Mac Os, because Docker did not supported  using GPU)
* uncomment the configuration in the [docker-compose.yml](docker-compose.yml) file
* run command
  1. docker exec -it ollama ollama pull deepseek-r1:14b
  2. docker exec -it ollama ollama pull nomic-embed-text:latest

# Project License Agreement

BY DOWNLOADING, INSTALLING, OR OTHERWISE USING THIS PROJECT, YOU AGREE TO BE BOUND BY THE TERMS OF THIS LICENSE AGREEMENT. IF YOU DO NOT AGREE WITH THESE TERMS, YOU ARE NOT PERMITTED TO USE, COPY, OR DISTRIBUTE THIS SOFTWARE IN ANY FORM.

ALL RIGHTS TO THIS PROJECT OWNED BY PAVEL SIMANOVICH (hereinafter referred to as the "Owner").

## License

This License Agreement grants individuals who wish to use, study, modify, or contribute to the project a limited right to use the source code of the project for **non-commercial and/or research purposes only**, provided the following conditions are met:

1. All copyright notices and attributions to the original owner must be retained in all copies or substantial portions of the project.
2. The project or any part of it may not be used for commercial purposes without prior written permission from the Owner.
3. Neither the source code nor compiled versions of the project may be distributed as a standalone product, plugin, library, or SDK without prior coordination with the Owner.
4. Participation by third-party developers is allowed only by invitation or with written consent from the Owner, and all contributions remain under the control and ownership of the Owner.

## Disclaimer of Warranty

THE PROJECT IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

## Copyright Notice

All rights reserved by :  
Pavel Simanovich 
paul.simanovich@gmail.com

If you wish to use this project for commercial purposes or use any parts from him, make significant modifications, or become a regular contributor — please contact us directly to discuss terms and establish an agreement.