const express = require('express');
const mqtt = require('mqtt');
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();
const cors = require('cors');

const app = express();
app.use(cors({
    origin: '*',  // Permite requisições de qualquer origem
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // Permite esses métodos HTTP
    allowedHeaders: ['Content-Type', 'Authorization'],  // Permite estes cabeçalhos
}));
const port = process.env.PORT || 3000;

// Conecta ao MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Conectado ao MongoDB'))
    .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

// Modelos do MongoDB
const SensorData = mongoose.model('SensorData', new mongoose.Schema({
    temperature: Number,
    humidity: Number,
    timestamp: { type: Date, default: Date.now },
}));

const WindowState = mongoose.model('WindowState', new mongoose.Schema({
    state: { type: String, enum: ['open', 'closed'], required: true },
    timestamp: { type: Date, default: Date.now },
}));

// Configuração do cliente MQTT para HiveMQ Cloud com TLS
const mqttOptions = {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    ca: [fs.readFileSync(process.env.MQTT_CAFILE)], // Carrega o certificado CA
    protocol: 'mqtts', // MQTT seguro via TLS
};

const mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL, mqttOptions);

mqttClient.on('connect', () => {
    console.log('✅ Conectado ao broker MQTT');
    mqttClient.subscribe('esp32/sensor');
    mqttClient.subscribe('esp32/window/control');
});

mqttClient.on('error', (err) => {
    console.error('❌ Erro na conexão MQTT:', err);
});

mqttClient.on('message', async (topic, message) => {
    try {
        const data = JSON.parse(message.toString());

        if (topic === 'esp32/sensor') {
            console.log('📡 Dados recebidos:', data);

            const sensorData = new SensorData({
                temperature: data.temperatura,
                humidity: data.umidade,
            });

            await sensorData.save();
            console.log('✅ Dados salvos no MongoDB');
        }

        if (topic === 'esp32/window/control') {
            console.log('🪟 Estado da janela recebido:', data);

            if (['open', 'closed'].includes(data.state)) {
                const windowState = new WindowState({ state: data.state });
                await windowState.save();
                console.log('✅ Estado da janela salvo no MongoDB');
            }
        }
    } catch (error) {
        console.error('❌ Erro ao processar mensagem MQTT:', error);
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota para testar o servidor
app.get('/', (req, res) => res.send('🚀 Backend MQTT está funcionando!'));

// Obtém o último estado da janela
app.get('/window/state', async (req, res) => {
    const latestState = await WindowState.findOne().sort({ timestamp: -1 });

    if (!latestState) return res.status(404).json({ message: "Estado da janela não encontrado" });

    res.json({ state: latestState.state });
});

// Controla a janela via MQTT
app.post('/window/control', async (req, res) => {
    const { action } = req.body;

    if (!['open', 'closed'].includes(action)) {
        return res.status(400).json({ message: "Ação inválida, use 'open' ou 'closed'" });
    }

    try {
        mqttClient.publish('esp32/window/control', JSON.stringify({ action }));
        res.json({ message: `Comando enviado: ${action}` });
    } catch (error) {
        console.error('❌ Erro ao enviar comando MQTT:', error);
        res.status(500).json({ message: "Erro interno no servidor" });
    }
});

// Obtém o último dado do sensor
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
        console.error('❌ Erro ao buscar dados do sensor:', error);
        res.status(500).json({ message: "Erro interno no servidor" });
    }
});

// Inicia o servidor
app.listen(port, () => console.log(`🚀 Servidor rodando na porta ${port}`));
