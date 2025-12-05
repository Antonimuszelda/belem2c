// 📊 Analytics Service - Rastreamento de Eventos
export class AnalyticsService {
  private static sessionId: string = this.generateSessionId();
  private static events: any[] = [];
  
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
  
  /**
   * Rastreia evento de usuário
   */
  static trackEvent(category: string, action: string, label?: string, value?: number): void {
    const event = {
      category,
      action,
      label,
      value,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      url: window.location.pathname
    };
    
    this.events.push(event);
    console.log('📊 Analytics:', event);
    
    // Enviar para backend (opcional)
    // this.sendToBackend(event);
    
    // Integração com Google Analytics (se configurado)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value
      });
    }
  }
  
  /**
   * Rastreia visualização de página
   */
  static trackPageView(page: string, title?: string): void {
    this.trackEvent('Navigation', 'page_view', page);
    
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: page,
        page_title: title
      });
    }
  }
  
  /**
   * Rastreia erro
   */
  static trackError(error: Error, context?: string): void {
    this.trackEvent('Error', error.name, `${context}: ${error.message}`);
  }
  
  /**
   * Rastreia timing/performance
   */
  static trackTiming(category: string, variable: string, time: number, label?: string): void {
    this.trackEvent('Timing', variable, `${category}${label ? ` - ${label}` : ''}`, time);
  }
  
  /**
   * Rastreia uso de funcionalidade
   */
  static trackFeatureUsage(featureName: string, details?: string): void {
    this.trackEvent('Feature', 'usage', `${featureName}${details ? ` - ${details}` : ''}`);
  }
  
  /**
   * Rastreia interação com mapa
   */
  static trackMapInteraction(action: string, details?: string): void {
    this.trackEvent('Map', action, details);
  }
  
  /**
   * Rastreia análise de AI
   */
  static trackAIAnalysis(areaSize: number, duration: number, success: boolean): void {
    this.trackEvent(
      'AI_Analysis',
      success ? 'completed' : 'failed',
      `${areaSize.toFixed(2)}km²`,
      duration
    );
  }
  
  /**
   * Retorna estatísticas da sessão
   */
  static getSessionStats(): {
    sessionId: string;
    totalEvents: number;
    duration: number;
    topActions: Array<{ action: string; count: number }>;
  } {
    const actionCounts = this.events.reduce((acc, event) => {
      acc[event.action] = (acc[event.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count: count as number }))
      .sort((a, b) => (b.count as number) - (a.count as number))
      .slice(0, 5);
    
    const firstEvent = this.events[0];
    const duration = firstEvent 
      ? Date.now() - new Date(firstEvent.timestamp).getTime()
      : 0;
    
    return {
      sessionId: this.sessionId,
      totalEvents: this.events.length,
      duration: Math.round(duration / 1000), // segundos
      topActions
    };
  }
  
  /**
   * Exporta eventos para análise
   */
  static exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }
  
  /**
   * Envia eventos para backend (opcional)
   */
  static async sendToBackend(event: any): Promise<void> {
    try {
      const API_BASE = (import.meta as any).env.VITE_API_URL || "http://127.0.0.1:8000";
      await fetch(`${API_BASE}/api/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
    } catch (error) {
      // Silencioso - não queremos quebrar app por analytics
    }
  }
}

// Rastrear erros globais
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    AnalyticsService.trackError(event.error, 'Global Error');
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    AnalyticsService.trackError(
      new Error(event.reason),
      'Unhandled Promise Rejection'
    );
  });
}
