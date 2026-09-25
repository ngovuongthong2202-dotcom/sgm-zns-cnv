import React from 'react';
import { logger } from '@/src/shared/lib/logger';

export function lazyRetry<T = object>(componentImport: () => Promise<{ default: React.ComponentType<T> }>) {
  return new Promise<{ default: React.ComponentType<T> }>((resolve, reject) => {
    componentImport()
      .then((res) => {
        try {
          sessionStorage.removeItem('sgm_lazy_reloaded');
        } catch (e) {
          logger.debug('sessionStorage access blocked', e);
        }
        resolve(res);
      })
      .catch((error) => {
        logger.warn('Lazy import failed, retrying in 1s...', error);
        setTimeout(() => {
          componentImport()
            .then((res) => {
              try {
                sessionStorage.removeItem('sgm_lazy_reloaded');
              } catch (e) {
                logger.debug('sessionStorage access blocked', e);
              }
              resolve(res);
            })
            .catch((err) => {
              logger.error('Lazy import failed again.', err);
              try {
                const reloaded = sessionStorage.getItem('sgm_lazy_reloaded');
                if (!reloaded) {
                  sessionStorage.setItem('sgm_lazy_reloaded', 'true');
                  window.location.reload();
                  return;
                }
              } catch (e) {
                logger.debug('sessionStorage reload blocked', e);
              }
              reject(err);
            });
        }, 1000);
      });
  });
}
