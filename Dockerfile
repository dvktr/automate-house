# ---- Broker (Mosquitto) ----
    FROM eclipse-mosquitto:2 AS broker
    WORKDIR /mosquitto
    COPY broker/mosquitto.conf /mosquitto/config/mosquitto.conf
    CMD ["mosquitto", "-c", "/mosquitto/config/mosquitto.conf"]
    
    # ---- MongoDB ----
    FROM mongo:6.0 AS mongo
    WORKDIR /data/db
    ENV MONGO_INITDB_ROOT_USERNAME=automatehousemqtt
    ENV MONGO_INITDB_ROOT_PASSWORD=M3h5dQ1sAoZDOSVV
    CMD ["mongod"]
    
    # ---- Backend (Node.js) ----
    FROM node:18 AS backend
    WORKDIR /app
    COPY backend/package.json backend/package-lock.json ./
    RUN npm install
    COPY backend .
    ENV MQTT_BROKER_URL=mqtt://broker:1883
    ENV MONGO_URI=mongodb+srv://automatehousemqtt:M3h5dQ1sAoZDOSVV@automatehouse.93szd.mongodb.net/sensor_db?retryWrites=true&w=majority&appName=AutomateHouse
    ENV PORT=3000
    EXPOSE 3000
    CMD ["node", "index.js"]
    