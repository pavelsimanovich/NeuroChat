# Chat with Ollama and Spring Boot AI

#### First steps:

Download
https://ollama.com/download

Choose model
 https://ollama.com/search

#### Pull model and run in console (e.g. gemma3:4b or gemma3:12b)
1. ollama pull gemma3:4b
2. ollama run gemma3:4b
3. Change model in [application.yaml](src/main/resources/application.yaml)
4. Delete model ollama rm gemma3:4b

#### Also model can be available in the Docker
* uncomment the configuration in the [docker-compose.yml](docker-compose.yml) file
* run command
  1. docker exec -it ollama ollama pull gemma3:4b
  2. docker exec -it ollama ollama pull nomic-embed-text:latest