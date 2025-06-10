# ollamachat

Download
https://ollama.com/download

Choose model
https://ollama.com/search

#### Pull model and run in console (e.g. deepseek-r1)
1. ollama pull deepseek-r1:8b
2. ollama run deepseek-r1:8b

#### Also model can be available in Docker
* uncomment the configuration in the [docker-compose.yml](docker-compose.yml) file
* run command
  1. docker exec -it ollama ollama pull deepseek-r1:8b
  2. docker exec -it ollama ollama pull nomic-embed-text:latest