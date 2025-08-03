# Настройка SSL/TLS для защищенного соединения

## Общая информация

Для обеспечения безопасного соединения в приложении настроен SSL/TLS протокол, который гарантирует:

1. **Шифрование данных** - все данные, передаваемые между клиентом и сервером, зашифрованы
2. **Аутентификацию сервера** - клиент может быть уверен, что подключается к легитимному серверу
3. **Целостность данных** - данные не могут быть изменены без обнаружения при передаче

## Инструкция по настройке

### 1. Создание SSL-сертификата

#### Для разработки (самоподписанный сертификат)

```bash
keytool -genkeypair -alias ollama-ai -keyalg RSA -keysize 2048 -storetype PKCS12 -keystore keystore.p12 -validity 3650 -storepass changeit
```

Поместите сгенерированный файл keystore.p12 в директорию `src/main/resources/keystore/`

#### Для продакшена (Let's Encrypt)

1. Установите certbot: https://certbot.eff.org/
2. Получите сертификат для вашего домена:
   ```bash
   certbot certonly --standalone -d yourdomain.com
   ```
3. Конвертируйте полученные сертификаты в формат PKCS12:
   ```bash
   openssl pkcs12 -export -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem \
     -inkey /etc/letsencrypt/live/yourdomain.com/privkey.pem \
     -out keystore.p12 -name ollama-ai -password pass:changeit
   ```

### 2. Настройка приложения

#### Активация SSL-профиля

Для запуска приложения с SSL используйте профиль `ssl`:

```bash
java -jar your-app.jar --spring.profiles.active=ssl
```

Или с помощью переменной окружения:

```bash
export SPRING_PROFILES_ACTIVE=ssl
java -jar your-app.jar
```

#### Переменные окружения для безопасного хранения паролей

Для продакшн-окружения рекомендуется указывать пароли через переменные окружения:

```bash
export SSL_KEYSTORE_PASSWORD=your-secure-password
export ENCRYPTION_SECRET_KEY=your-base64-encoded-secret-key
export REMEMBER_ME_KEY=your-secure-remember-me-key
```

### 3. Проверка настройки

После запуска приложения проверьте работу SSL:

1. Откройте в браузере https://localhost:8443 (или https://yourdomain.com в продакшне)
2. Проверьте наличие иконки замка в адресной строке браузера
3. Перейдите на страницу /security-check для подробной информации о соединении
4. Выполните запрос к API `/api/security-check` для программной проверки

### 4. Автоматическое обновление сертификатов Let's Encrypt

Сертификаты Let's Encrypt действительны только 90 дней. Настройте автоматическое обновление:

```bash
# Создайте скрипт обновления
cat > /usr/local/bin/renew-ssl.sh << 'EOF'
#!/bin/bash
certbot renew --quiet

# Конвертация обновленных сертификатов
if [ $? -eq 0 ]; then
  openssl pkcs12 -export -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem \
    -inkey /etc/letsencrypt/live/yourdomain.com/privkey.pem \
    -out /path/to/your/keystore.p12 -name ollama-ai -password pass:${SSL_KEYSTORE_PASSWORD}

  # Перезапуск приложения для применения новых сертификатов
  systemctl restart your-app.service
fi
EOF

chmod +x /usr/local/bin/renew-ssl.sh

# Добавьте в crontab
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/renew-ssl.sh") | crontab -
```

## Дополнительные ресурсы

- [Spring Boot HTTPS/SSL Documentation](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#howto.webserver.configure-ssl)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)



# Настройка локального центра сертификации (CA)

Эта инструкция поможет создать локальный центр сертификации и выпустить сертификаты, которым будут доверять браузеры при локальной разработке.

## 1. Создание корневого CA сертификата

```bash
# Создаем директорию для CA
mkdir -p ~/local-ca/certs ~/local-ca/private

# Генерируем приватный ключ для корневого CA
openssl genrsa -out ~/local-ca/private/ca.key 4096

# Создаем корневой сертификат CA (действительный 10 лет)
openssl req -x509 -new -nodes -key ~/local-ca/private/ca.key -sha256 -days 3650 -out ~/local-ca/certs/ca.crt -subj "/C=RU/ST=Belarus/L=Minsk/O=PS/OU=Development/CN=Local Development CA"
```

## 2. Установка корневого сертификата в систему

### Windows

1. Дважды кликните на файл `ca.crt`
2. Нажмите "Установить сертификат"
3. Выберите "Локальный компьютер" и нажмите "Далее"
4. Выберите "Поместить все сертификаты в следующее хранилище"
5. Нажмите "Обзор" и выберите "Доверенные корневые центры сертификации"
6. Нажмите "Далее" и "Готово"

### macOS

```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ~/local-ca/certs/ca.crt
```

### Linux (Ubuntu/Debian)

```bash
sudo cp ~/local-ca/certs/ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

## 3. Создание сертификата для локального сервера

### Создание конфигурационного файла

Создайте файл `~/local-ca/server.cnf` со следующим содержимым:

```
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = RU
ST = Your-State
L = Your-City
O = Local Development
OU = Development
CN = localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names


[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = 127.0.0.1
IP.1 = 127.0.0.1
IP.2 = ::1
```

### Генерация сертификата

```bash
# Создаем приватный ключ для сервера
openssl genrsa -out ~/local-ca/private/server.key 2048

# Создаем запрос на подпись сертификата (CSR)
openssl req -new -key ~/local-ca/private/server.key -out ~/local-ca/private/server.csr -config ~/local-ca/server.cnf

# Подписываем CSR нашим корневым CA
openssl x509 -req -in ~/local-ca/private/server.csr \
    -CA ~/local-ca/certs/ca.crt \
    -CAkey ~/local-ca/private/ca.key \
    -CAcreateserial \
    -out ~/local-ca/certs/server.crt \
    -days 825 \
    -sha256 \
    -extfile ~/local-ca/server.cnf \
    -extensions v3_req

# Создаем PKCS12 хранилище для Spring Boot
openssl pkcs12 -export \
    -in ~/local-ca/certs/server.crt \
    -inkey ~/local-ca/private/server.key \
    -out ~/local-ca/certs/keystore.p12 \
    -name ollama-ai \
    -password pass:password
```

## 4. Копирование сертификата в проект

```bash
mkdir -p src/main/resources/keystore
cp ~/local-ca/certs/keystore.p12 src/main/resources/keystore/
```

## 5. Проверка сертификата

```bash
# Проверка сертификата сервера
openssl x509 -in ~/local-ca/certs/server.crt -text -noout

# Проверка PKCS12 хранилища
openssl pkcs12 -info -in ~/local-ca/certs/keystore.p12 -password pass:password -noout
```

## 6. Обновление конфигурации Spring Boot

Убедитесь, что в `application.yaml` указаны правильные параметры:

```yaml
server:
  ssl:
    key-store: classpath:keystore/keystore.p12
    key-store-password: password
    key-store-type: PKCS12
    key-alias: ollama-ai
```

## 7. Тестирование

1. Запустите приложение
2. Откройте https://localhost:8443 в браузере
3. Браузер должен отображать защищенное соединение (зеленый замок)

## Дополнительно: Проверка доверия

```bash
# Проверяем валидность сертификата
openssl verify -CAfile ~/local-ca/certs/ca.crt ~/local-ca/certs/server.crt
```

Это должно вывести:
```
/path/to/server.crt: OK
```
