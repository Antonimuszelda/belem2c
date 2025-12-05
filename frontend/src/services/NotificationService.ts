// 🔔 Notification Service - Alertas e Notificações Push
export class NotificationService {
  
  /**
   * Solicita permissão para notificações
   */
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Este navegador não suporta notificações');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission === 'denied') {
      console.warn('Permissão de notificações negada');
      return false;
    }
    
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      return false;
    }
  }
  
  /**
   * Envia notificação do navegador
   */
  static async notify(title: string, options?: NotificationOptions): Promise<void> {
    if (Notification.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return;
    }
    
    const defaultOptions: NotificationOptions = {
      icon: '/logo.png',
      badge: '/badge.png',
      ...options
    };
    
    try {
      const notification = new Notification(title, defaultOptions);
      
      // Auto-fechar após 5 segundos
      setTimeout(() => notification.close(), 5000);
      
      // Click handler
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
    }
  }
  
  /**
   * Notificação de alerta crítico
   */
  static async alertCritical(message: string, details?: string): Promise<void> {
    await this.notify('🚨 Alerta Crítico', {
      body: details || message,
      tag: 'critical-alert',
      requireInteraction: true
    });
  }
  
  /**
   * Notificação de aviso
   */
  static async alertWarning(message: string): Promise<void> {
    await this.notify('⚠️ Atenção', {
      body: message,
      tag: 'warning-alert'
    });
  }
  
  /**
   * Notificação de sucesso
   */
  static async alertSuccess(message: string): Promise<void> {
    await this.notify('✅ Sucesso', {
      body: message,
      tag: 'success-alert'
    });
  }
  
  /**
   * Notificação de informação
   */
  static async alertInfo(message: string): Promise<void> {
    await this.notify('ℹ️ Informação', {
      body: message,
      tag: 'info-alert'
    });
  }
  
  /**
   * Notificação de análise concluída
   */
  static async analysisComplete(areaSize: number, summary?: string): Promise<void> {
    await this.notify('🤖 Análise Concluída', {
      body: summary || `Análise da área de ${areaSize.toFixed(2)} km² finalizada com sucesso`,
      tag: 'analysis-complete',
      requireInteraction: false
    });
  }
  
  /**
   * Notificação de risco ambiental
   */
  static async environmentalRisk(riskType: string, severity: string, location: string): Promise<void> {
    const icons: Record<string, string> = {
      LOW: 'ℹ️',
      MEDIUM: '⚠️',
      HIGH: '🔴',
      CRITICAL: '🚨'
    };
    
    await this.notify(
      `${icons[severity] || '⚠️'} Risco ${riskType}`,
      {
        body: `Nível: ${severity}\nLocalização: ${location}`,
        tag: `risk-${riskType.toLowerCase()}`,
        requireInteraction: severity === 'CRITICAL'
      }
    );
  }
  
  /**
   * Verifica se notificações estão habilitadas
   */
  static isEnabled(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }
  
  /**
   * Retorna status da permissão
   */
  static getPermissionStatus(): NotificationPermission {
    return 'Notification' in window ? Notification.permission : 'denied';
  }
}
