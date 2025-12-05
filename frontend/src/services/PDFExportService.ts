// 📄 PDF Export Service - Relatórios Técnicos Automatizados
import jsPDF from 'jspdf';
import type { VulnerabilityResult } from './VulnerabilityCalculator';

export interface ReportData {
  title: string;
  location: string;
  date: string;
  avgTemperature: number;
  vegetationDensity: number;
  floodRisk: string;
  aiSummary: string;
  recommendations: string[];
  vulnerability?: VulnerabilityResult;
  areaSize?: number;
}

export class PDFExportService {
  /**
   * Gera relatório técnico completo em PDF
   */
  static async generateReport(data: ReportData): Promise<Blob> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // ==== CAPA ====
    // Gradiente de fundo (simulado com retângulos)
    pdf.setFillColor(10, 15, 30);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Logo/Título
    pdf.setFontSize(40);
    pdf.setTextColor(0, 217, 255);
    pdf.text('HARP-IA', pageWidth / 2, 80, { align: 'center' });
    
    pdf.setFontSize(16);
    pdf.setTextColor(200, 200, 200);
    pdf.text('Sistema de Análise Geoespacial Inteligente', pageWidth / 2, 95, { align: 'center' });
    
    // Informações principais
    pdf.setFontSize(24);
    pdf.setTextColor(255, 255, 255);
    pdf.text(data.title, pageWidth / 2, 130, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setTextColor(180, 180, 180);
    pdf.text(`Localização: ${data.location}`, pageWidth / 2, 150, { align: 'center' });
    pdf.text(`Data: ${data.date}`, pageWidth / 2, 160, { align: 'center' });
    if (data.areaSize) {
      pdf.text(`Área: ${data.areaSize.toFixed(2)} km²`, pageWidth / 2, 170, { align: 'center' });
    }
    
    // Rodapé da capa
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Relatório Técnico Automatizado', pageWidth / 2, pageHeight - 20, { align: 'center' });
    
    // ==== PÁGINA 2: RESUMO EXECUTIVO ====
    pdf.addPage();
    yPosition = margin;
    
    // Título da seção
    pdf.setFontSize(18);
    pdf.setTextColor(0, 217, 255);
    pdf.text('Resumo Executivo', margin, yPosition);
    yPosition += 15;
    
    // Informações básicas
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    
    const info = [
      `Localização: ${data.location}`,
      `Data da análise: ${data.date}`,
      data.areaSize ? `Área analisada: ${data.areaSize.toFixed(2)} km²` : null
    ].filter(Boolean);
    
    info.forEach(line => {
      pdf.text(line!, margin, yPosition);
      yPosition += 7;
    });
    
    yPosition += 10;
    
    // Métricas principais
    pdf.setFontSize(14);
    pdf.setTextColor(0, 217, 255);
    pdf.text('Métricas Principais', margin, yPosition);
    yPosition += 10;
    
    // Box de temperatura
    this.addMetricBox(pdf, margin, yPosition, 50, 30, 
      'Temperatura Média', 
      `${data.avgTemperature.toFixed(1)}°C`,
      data.avgTemperature > 30 ? [255, 23, 68] : [0, 230, 118]
    );
    
    // Box de vegetação
    this.addMetricBox(pdf, margin + 60, yPosition, 50, 30,
      'Densidade Vegetal',
      `${data.vegetationDensity.toFixed(1)}%`,
      data.vegetationDensity < 30 ? [255, 23, 68] : [0, 230, 118]
    );
    
    // Box de risco
    const riskColors: Record<string, number[]> = {
      'BAIXO': [0, 230, 118],
      'MÉDIO': [255, 214, 0],
      'ALTO': [255, 109, 0],
      'CRÍTICO': [255, 23, 68],
      'LOW': [0, 230, 118],
      'MEDIUM': [255, 214, 0],
      'HIGH': [255, 109, 0],
      'CRITICAL': [255, 23, 68]
    };
    
    this.addMetricBox(pdf, margin + 120, yPosition, 50, 30,
      'Risco Alagamento',
      data.floodRisk,
      riskColors[data.floodRisk] || [255, 214, 0]
    );
    
    yPosition += 40;
    
    // Resumo da IA
    pdf.setFontSize(14);
    pdf.setTextColor(0, 217, 255);
    pdf.text('Análise Automatizada', margin, yPosition);
    yPosition += 10;
    
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    const summaryLines = pdf.splitTextToSize(data.aiSummary, pageWidth - 2 * margin);
    pdf.text(summaryLines, margin, yPosition);
    yPosition += summaryLines.length * 7 + 10;
    
    // Recomendações
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = margin;
    }
    
    pdf.setFontSize(14);
    pdf.setTextColor(0, 217, 255);
    pdf.text('Recomendações', margin, yPosition);
    yPosition += 10;
    
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    
    data.recommendations.forEach((rec, idx) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = margin;
      }
      
      const recLines = pdf.splitTextToSize(`${idx + 1}. ${rec}`, pageWidth - 2 * margin - 5);
      pdf.text(recLines, margin + 5, yPosition);
      yPosition += recLines.length * 7 + 5;
    });
    
    // ==== PÁGINA 3: VULNERABILIDADE (se disponível) ====
    if (data.vulnerability) {
      pdf.addPage();
      yPosition = margin;
      
      pdf.setFontSize(18);
      pdf.setTextColor(0, 217, 255);
      pdf.text('Índice de Vulnerabilidade', margin, yPosition);
      yPosition += 15;
      
      // Score geral
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Vulnerabilidade Geral: ${data.vulnerability.overallScore.toFixed(1)}/100`, margin, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(12);
      const levelColors: Record<string, number[]> = {
        'BAIXO': [0, 230, 118],
        'MODERADO': [255, 214, 0],
        'ALTO': [255, 109, 0],
        'CRÍTICO': [255, 23, 68]
      };
      
      const color = levelColors[data.vulnerability.level] || [0, 0, 0];
      pdf.setTextColor(color[0], color[1], color[2]);
      pdf.text(`Nível: ${data.vulnerability.level}`, margin, yPosition);
      yPosition += 15;
      
      // Breakdown por categoria
      pdf.setFontSize(12);
      pdf.setTextColor(0, 217, 255);
      pdf.text('Detalhamento por Categoria:', margin, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      
      const categories = data.vulnerability.breakdown;
      Object.entries(categories).forEach(([key, value]) => {
        const label = {
          'heat': 'Ilha de Calor',
          'flood': 'Risco de Alagamento',
          'vegetation': 'Perda de Vegetação',
          'social': 'Vulnerabilidade Social',
          'air': 'Qualidade do Ar'
        }[key] || key;
        
        pdf.text(`• ${label}: ${value.toFixed(1)}/100`, margin + 5, yPosition);
        yPosition += 7;
      });
      
      yPosition += 10;
      
      // Recomendações específicas de vulnerabilidade
      if (data.vulnerability.recommendations && data.vulnerability.recommendations.length > 0) {
        pdf.setFontSize(12);
        pdf.setTextColor(0, 217, 255);
        pdf.text('Recomendações Específicas:', margin, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        
        data.vulnerability.recommendations.forEach((rec, idx) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = margin;
          }
          
          const recLines = pdf.splitTextToSize(`${idx + 1}. ${rec}`, pageWidth - 2 * margin - 5);
          pdf.text(recLines, margin + 5, yPosition);
          yPosition += recLines.length * 7 + 5;
        });
      }
    }
    
    // Adicionar rodapé em todas as páginas
    const totalPages = pdf.getNumberOfPages();
    for (let i = 2; i <= totalPages; i++) { // Pula a capa (página 1)
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(
        `HARP-IA | Página ${i}/${totalPages} | Gerado em: ${data.date}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
    
    return pdf.output('blob');
  }

  /**
   * Adiciona uma caixa de métrica colorida
   */
  private static addMetricBox(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    value: string,
    borderColor: number[]
  ) {
    // Borda colorida
    pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    pdf.setLineWidth(2);
    pdf.rect(x, y, width, height);
    
    // Label
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(label, x + width / 2, y + 10, { align: 'center' });
    
    // Value
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text(value, x + width / 2, y + 22, { align: 'center' });
  }

  /**
   * Faz download do relatório
   */
  static async downloadReport(data: ReportData, filename: string = 'relatorio-harpia.pdf'): Promise<void> {
    const blob = await this.generateReport(data);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
