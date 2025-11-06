// frontend/src/components/ControlPanel.tsx

import React, { useState } from 'react';
import axios from 'axios'; // Importa o Axios

interface ControlPanelProps {
    defaultLatitude: number;
    defaultLongitude: number;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const API_URL = `${API_BASE}/analyze`; // 🎯 URL do seu endpoint FastAPI

const ControlPanel: React.FC<ControlPanelProps> = ({ defaultLatitude, defaultLongitude }) => {
    // Estados para os dados de entrada
    const [latitude, setLatitude] = useState(defaultLatitude);
    const [longitude, setLongitude] = useState(defaultLongitude);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Estados para a saída
    const [report, setReport] = useState('Nenhum relatório gerado.');
    const [isLoading, setIsLoading] = useState(false);

    // Função que faz a chamada ao Backend
    const handleAnalyze = async () => {
        if (!startDate || !endDate) {
            setReport("Por favor, preencha as datas inicial e final.");
            return;
        }

        setIsLoading(true);
        setReport('Analisando... Aguarde a resposta da IA.');

        try {
            // Estrutura o corpo da requisição JSON
            const requestBody = {
                latitude: latitude,
                longitude: longitude,
                start_date: startDate,
                end_date: endDate,
            };

            // Faz a chamada POST para o FastAPI
            const response = await axios.post(API_URL, requestBody);

            // Se o FastAPI retornar sucesso, ele devolverá o texto do relatório
            setReport(response.data.analysis_report || "Erro: Relatório vazio recebido.");

        } catch (error) {
            console.error("Erro na comunicação com o Backend:", error);
            setReport("ERRO: Falha ao conectar ao servidor FastAPI (Verifique o terminal).");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            style={{ 
                position: 'absolute', 
                top: 20, 
                right: 20, 
                zIndex: 10, 
                backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                padding: '20px', 
                borderRadius: '8px', 
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                width: '350px' 
            }}
        >
            <h2 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>Sentinel IA - Análise Geoespacial</h2>
            
            {/* Campos de Entrada */}
            <div style={{ marginBottom: '10px' }}>
                <label>Latitude:</label>
                <input type="number" value={latitude} onChange={(e) => setLatitude(parseFloat(e.target.value))} style={{ width: '100%', padding: '5px', marginTop: '5px' }} />
            </div>
            
            <div style={{ marginBottom: '10px' }}>
                <label>Longitude:</label>
                <input type="number" value={longitude} onChange={(e) => setLongitude(parseFloat(e.target.value))} style={{ width: '100%', padding: '5px', marginTop: '5px' }} />
            </div>

            <div style={{ marginBottom: '10px' }}>
                <label>Data Inicial:</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%', padding: '5px', marginTop: '5px' }} />
            </div>

            <div style={{ marginBottom: '15px' }}>
                <label>Data Final:</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '100%', padding: '5px', marginTop: '5px' }} />
            </div>

            {/* Botão de Análise */}
            <button 
                onClick={handleAnalyze}
                disabled={isLoading}
                style={{ 
                    width: '100%', 
                    padding: '10px', 
                    backgroundColor: isLoading ? '#6c757d' : '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
            >
                {isLoading ? 'Analisando...' : 'Analisar Área com IA'}
            </button>
            
            {/* Área do Relatório */}
            <div style={{ marginTop: '15px', padding: '10px', border: '1px solid #ccc', minHeight: '100px', backgroundColor: '#f8f9fa', whiteSpace: 'pre-wrap' }}>
                {report}
            </div>
        </div>
    );
};

export default ControlPanel;