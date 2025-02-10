# Usa a imagem oficial do Mosquitto
FROM eclipse-mosquitto:2.0

# Copia o arquivo de configuração do Mosquitto
COPY mosquitto.conf /mosquitto/config/mosquitto.conf

# Expõe a porta padrão do MQTT (1883)
EXPOSE 1883

# Inicia o Mosquitto
CMD ["mosquitto", "-c", "/mosquitto/config/mosquitto.conf"]