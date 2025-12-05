// 💾 Cache Service - Local Storage com TTL
export class CacheService {
  /**
   * Obtém item do cache com validação de expiração
   */
  static get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      const { value, expiry } = JSON.parse(item);
      
      // Verificar se expirou
      if (Date.now() > expiry) {
        localStorage.removeItem(key);
        return null;
      }
      
      return value as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  /**
   * Armazena item no cache com TTL (Time To Live)
   */
  static set(key: string, value: any, ttlMinutes: number = 60): void {
    try {
      const expiry = Date.now() + ttlMinutes * 60 * 1000;
      const item = {
        value,
        expiry,
        created: Date.now()
      };
      
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.error('Cache set error:', error);
      // Se localStorage estiver cheio, limpar itens antigos
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.clearExpired();
        // Tentar novamente
        try {
          const expiry = Date.now() + ttlMinutes * 60 * 1000;
          localStorage.setItem(key, JSON.stringify({ value, expiry, created: Date.now() }));
        } catch {}
      }
    }
  }
  
  /**
   * Remove item específico do cache
   */
  static remove(key: string): void {
    localStorage.removeItem(key);
  }
  
  /**
   * Limpa todos os itens expirados do cache
   */
  static clearExpired(): void {
    const keys = Object.keys(localStorage);
    let cleared = 0;
    
    keys.forEach(key => {
      try {
        const item = localStorage.getItem(key);
        if (!item) return;
        
        const { expiry } = JSON.parse(item);
        if (Date.now() > expiry) {
          localStorage.removeItem(key);
          cleared++;
        }
      } catch {}
    });
    
    console.log(`🧹 Cache: ${cleared} itens expirados removidos`);
  }
  
  /**
   * Limpa todo o cache
   */
  static clear(): void {
    localStorage.clear();
    console.log('🗑️ Cache completamente limpo');
  }
  
  /**
   * Retorna estatísticas do cache
   */
  static getStats(): { total: number; size: string; oldest: Date | null } {
    const keys = Object.keys(localStorage);
    let totalSize = 0;
    let oldestTimestamp = Date.now();
    
    keys.forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        totalSize += item.length;
        try {
          const { created } = JSON.parse(item);
          if (created && created < oldestTimestamp) {
            oldestTimestamp = created;
          }
        } catch {}
      }
    });
    
    return {
      total: keys.length,
      size: `${(totalSize / 1024).toFixed(2)} KB`,
      oldest: oldestTimestamp < Date.now() ? new Date(oldestTimestamp) : null
    };
  }
}

// Auto-limpar cache expirado a cada 5 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    CacheService.clearExpired();
  }, 5 * 60 * 1000);
}
