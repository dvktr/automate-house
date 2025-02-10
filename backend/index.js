const express = require('express');
const mqtt = require('mqtt');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Conecta ao MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Conectado ao MongoDB'))
    .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Modelo para armazenar os dados do sensor
const SensorData = mongoose.model('SensorData', new mongoose.Schema({
    temperature: Number,
    humidity: Number,
    timestamp: { type: Date, default: Date.now },
}));

const WindowState = mongoose.model('WindowState', new mongoose.Schema({
    state: { type: String, enum: ['open', 'closed'], required: true },
    timestamp: { type: Date, default: Date.now },
}));

// Configura o cliente MQTT
const mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL);


mqttClient.on('connect', () => {
    console.log('Conectado ao broker MQTT');
    mqttClient.subscribe('esp32/sensor');
    mqttClient.subscribe('esp32/window/control');
});

mqttClient.on('message', async (topic, message) => {
    if (topic === 'esp32/sensor') {
        const data = JSON.parse(message.toString());
        console.log('Dados recebidos:', data);

        // Salva os dados no MongoDB
        const sensorData = new SensorData({
            temperature: data.temperatura,
            humidity: data.umidade,
        });
        sensorData.save()
            .then(() => console.log('Dados salvos no MongoDB'))
            .catch(err => console.error('Erro ao salvar dados:', err));
    }

    if (topic === 'esp32/window/control') {
        const data = JSON.parse(message.toString());
        console.log('Estado da janela recebido:', data);

        if (['open', 'closed'].includes(data.action)) {
                // Salva os dados no MongoDB
            const windowState = new WindowState({
                state: data.action,
            });
            windowState.save()
                .then(() => console.log('Dados salvos no MongoDB'))
                .catch(err => console.error('Erro ao salvar dados:', err));
        }
    }
});

app.use(express.json());

// Rota para testar o servidor
app.get('/', (req, res) => {
    res.send('Backend MQTT está funcionando!');
});


app.get('/window/state', async (req, res) => {
    const latestState = await WindowState.findOne().sort({ timestamp: -1 });

    if (!latestState) {
        return res.status(404).json({ message: "Estado da janela não encontrado" });
    }

    res.json({ state: latestState.state });
});


app.post('/window/control', async (req, res) => {
    const { action } = req.body;

    if (!['open', 'closed'].includes(action)) {
        return res.status(400).json({ message: "Ação inválida, use 'open' ou 'closed'" });
    }

    try {
        // Publica a mensagem via MQTT para o ESP32
        mqttClient.publish('esp32/window/control', JSON.stringify({ action }));

        res.json({ message: `Comando enviado: ${action}` });
    } catch (error) {
        console.error('Erro ao enviar comando para a janela:', error);
        res.status(500).json({ message: "Erro interno no servidor" });
    }
});


// Rota para obter o último dado do sensor
app.get('/sensor/last', async (req, res) => {
    try {
        const lastSensorData = await SensorData.findOne().sort({ timestamp: -1 });

        if (!lastSensorData) {
            return res.status(404).json({ message: "Nenhum dado encontrado" });
        }

        res.json({
            temperature: lastSensorData.temperature,
            humidity: lastSensorData.humidity,
            timestamp: lastSensorData.timestamp
        });
    } catch (error) {
        console.error('Erro ao buscar dados do sensor:', error);
        res.status(500).json({ message: "Erro interno no servidor" });
    }
});


// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});