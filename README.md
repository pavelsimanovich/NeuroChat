# Chat with Ollama and Spring Boot AI

## First steps:

Download
https://ollama.com/download

Choose model
https://ollama.com/search
https://huggingface.co/

#### Pull model and run in console (e.g. gemma3:4b or gemma3:12b)
1. ollama pull gemma3:4b
2. ollama run gemma3:4b
3. Change model in [application.yaml](src/main/resources/application.yaml)

#### Also model can be running in the Docker
* uncomment the configuration in the [docker-compose.yml](docker-compose.yml) file
* run command
  1. docker exec -it ollama ollama pull gemma3:4b
  2. docker exec -it ollama ollama pull nomic-embed-text:latest

## Below are the key components and technologies used:

## Spring Framework:

- Spring Boot: Simplifies the configuration and deployment of the application, Embedded Tomcat server .
- Spring Web + Flux: Facilitates the creation of RESTful web services and handles HTTP requests.
- Spring Thymeleaf: Server-side templating, Spring MVC binding .
- Spring Security: Provides authentication and authorization.
- Spring AI: Ollama API integration layer, AI response processing. https://spring.io/projects/spring-ai

## ☕ Java 21

-  Programming language for the application.

## 🎨 Frontend Stack

- JS + Bootstrap.
- Prism.js for code highlighting in responses.

## 🗃️ Database

- Mysql8 for storing data (chats, messages, users)

## Build Automation:

- Gradle: Used for project build automation, dependency management, and task execution.

## Project Structure:
    project-root/
    ├── src/
    │   ├── main/
    │   │   ├── java/com/ps/ollamaai
    │   │   │   ├── config/       # Spring configs
    │   │   │   ├── constants/    # Constants
    │   │   │   ├── controller/   # REST and FLUX endpoints
    │   │   │   ├── domaim/       # DB entities
    │   │   │   ├── dto/          # DTO
    │   │   │   ├── exceptions/   # Exceptions
    │   │   │   ├── llm/          # Utility objects for llm
    │   │   │   ├── repository/   # DAO layer
    │   │   │   └── service/      # Business logic
    │   │   │   └── userdetails/  # Custom user details
    │   │   └── resources/
    │   │       ├── static/       # JS/CSS
    │   │       └── templates/    # Thymeleaf
    ├── build.gradle              # Dependency spec
    └── gradlew                   # Wrapper script

## ✨ Key Features

### 🌐 REST API
- **Flexible Endpoints**: Comprehensive API for seamless interaction with the chat system
- **Stream Support**: Real-time communication using streaming technology
- **Room Management**: Create, join and manage chat rooms programmatically
- **User System**: Secure login/registration flows

### 🤖 AI Chat Functionality
- **Ollama Integration**: Powered by cutting-edge Ollama API for intelligent responses
- **Context-Aware**: Maintains conversation context for natural interactions
- **Chat History**:
    - Persistent message storage
    - Conversation continuity across sessions
- **Usage Controls**:
    - Configurable rate limiting
- **Image Analysis**
- **Chat Export**
- **Voice input**
- **User Settings**
  - Lite and Dark Mode
  - User can add a System Prompt

### P.S.
- Project in development and can contain errors, some part of code should be rewritten.
- Any help would be appreciated
